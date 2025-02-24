import { CallApiConfig } from '@configs/call-api.config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { LoggerObject } from '@reporting_statistic/services/reward-catalog/personalized-reward-catalog.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';
import {
  InjectCouponSummary,
  InjectCouponSummaryDocument,
} from '@/transaction/models/inject-coupon-summary.model';

import { CreateCouponSummaryDto } from './dto/create-coupon-summary.dto';

const moment = require('moment-timezone');

type FilterCouponSummary = {
  msisdn: string;
  program_name: string;
  keyword_name: string;
};

@Injectable()
export class CouponSummaryService {
  private readonly COUPON_SUMMARY_CUTOFF_START: string =
    CallApiConfig.COUPON_SUMMARY_CUTOFF_START;
  private readonly COUPON_SUMMARY_CUTOFF_END: string =
    CallApiConfig.COUPON_SUMMARY_CUTOFF_END;

  constructor(
    @InjectModel(InjectCouponSummary.name, 'reporting')
    private trxCouponSummary: Model<InjectCouponSummaryDocument>,

    @InjectModel(InjectCoupon.name, 'reporting')
    private trxInjectCoupon: Model<InjectCouponDocument>,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    private readonly applicationService: ApplicationService,
  ) {}

  private async loggerReportStatistic(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(end.getTime() - start.getTime());

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_statistic',
        service: CouponSummaryService.name,
        step: step,
        taken_time: takenTime,
        user_id: new IAccount(payload.account),
        param: payload,
        result: {
          message: JSON.stringify(isError ? error : payload),
        },
      } satisfies LoggingData,
    });
  }

  private async getConfigCutOff(paramKey: string) {
    try {
      const cutOff = await this.applicationService.getConfig(paramKey);
      console.log(`${paramKey}`, cutOff);

      return moment(cutOff).utc();
    } catch (error) {
      console.log(
        'ERROR getConfigCutOff',
        {
          message: error.message,
          stack: error.stack,
        },
        '\n\n',
      );
    }
  }

  private async bulkUpsertCoupons(couponsData: any) {
    try {
      const bulkOperation = couponsData.map((coupon) => {
        const { payload } = coupon;
        const { total_coupon, ...payloadWithoutTotalCoupon } = payload;

        const filter: FilterCouponSummary = {
          msisdn: payloadWithoutTotalCoupon.msisdn,
          program_name: payloadWithoutTotalCoupon.program_name,
          keyword_name: payloadWithoutTotalCoupon.keyword_name,
        };

        return {
          updateOne: {
            filter,
            update: {
              $set: payloadWithoutTotalCoupon,
              $inc: { total_coupon },
            },
            upsert: true,
          },
        };
      });
      console.log('BULK OPERATION', JSON.stringify(bulkOperation));

      const result = await this.trxCouponSummary.bulkWrite(bulkOperation);
      console.log('Bulk Upsert Operation Successful:', result, '\n\n');
    } catch (error) {
      console.error(
        'ERROR bulkUpsertCoupons:',
        {
          message: error.message,
          stack: error.stack,
        },
        '\n\n',
      );
    }
  }

  public async countUpCustomerCouponSummary(
    payload: any,
    logger: LoggerObject,
  ) {
    const startProcess = new Date();
    const step = `${CouponSummaryService.name} - countUpCustomerCouponSummary`;
    const currentDate = moment().utc();
    console.log('currentDate', currentDate);

    const msisdn = payload?.incoming?.msisdn;
    const program = payload?.program;
    const keyword = payload?.keyword;
    const createCouponSummaryDto = {
      program_id: program?._id,
      program_name: program?.name,
      program_start: program?.start_period,
      program_end: program?.end_period,
      keyword_id: keyword?._id,
      keyword_name: keyword?.eligibility?.name,
      msisdn,
      total_coupon: 1,
    } as CreateCouponSummaryDto;
    const loggerPayload = { ...logger, createCouponSummaryDto };

    try {
      await this.loggerReportStatistic(
        loggerPayload,
        false,
        `${step} in progress`,
        '',
        startProcess,
      );

      const cutOffEnd = await this.getConfigCutOff(
        this.COUPON_SUMMARY_CUTOFF_END,
      );

      if (currentDate.isBefore(cutOffEnd)) {
        console.log('==== current date is before cut off ==== \n\n');

        await this.loggerReportStatistic(
          loggerPayload,
          false,
          `${step} skip with note : current date is before cut off`,
          '',
          startProcess,
        );
        return;
      }

      const couponSummaryPayload = [{ payload: createCouponSummaryDto }];
      await this.bulkUpsertCoupons(couponSummaryPayload);

      await this.loggerReportStatistic(
        loggerPayload,
        false,
        `${step} success`,
        '',
        startProcess,
      );
    } catch (error) {
      const errorMessage = {
        message: error.message,
        stack: error.stack,
      };

      console.log('ERROR countUpCustomerCouponSummary', errorMessage, '\n\n');

      await this.loggerReportStatistic(
        loggerPayload,
        true,
        `${step} error`,
        errorMessage,
        startProcess,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async syncCustomerCouponSummary(payload: any) {
    const startProcess = new Date();
    const step = `${CouponSummaryService.name} - syncCustomerCouponSummary`;

    try {
      await this.loggerReportStatistic(
        payload,
        false,
        `${step} in progress`,
        '',
        startProcess,
      );

      const msisdn = payload.msisdn;
      const keyword = payload?.keyword ?? null;
      const currentDate = moment().endOf('day').utc();
      const [cutOffStart, cutOffEnd] = await Promise.all([
        this.getConfigCutOff(this.COUPON_SUMMARY_CUTOFF_START),
        this.getConfigCutOff(this.COUPON_SUMMARY_CUTOFF_END),
      ]);

      const pipeline = [
        {
          $match: {
            created_at: {
              $gte: cutOffStart.toDate(),
              $lte: cutOffEnd.toDate(),
            },
            msisdn,
            ...(keyword !== null ? { keyword } : {}),
            $expr: {
              $and: [
                {
                  $gte: [{ $toDate: '$program_end' }, currentDate.toDate()],
                },
                { $eq: ['$core_type', 'Coupon'] },
                { $eq: ['$deleted_at', null] },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              program_name: '$program_name',
              keyword: '$keyword',
            },
            latestData: {
              $max: {
                $mergeObjects: [
                  {
                    updated_at: '$updated',
                  },
                  '$$ROOT',
                ],
              },
            },
            total_coupon: {
              $sum: 1,
            },
          },
        },
        {
          $lookup: {
            from: 'keywords',
            let: {
              keywordName: '$latestData.keyword',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ['$eligibility.name', '$$keywordName'],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  'eligibility.name': 1,
                },
              },
            ],
            as: 'latestData.keyword',
          },
        },
        {
          $addFields: {
            payload: {
              program_id: '$latestData.program_id',
              program_name: '$latestData.program_name',
              program_start: '$latestData.program_start',
              program_end: '$latestData.program_end',
              keyword_id: {
                $arrayElemAt: ['$latestData.keyword._id', 0],
              },
              keyword_name: '$_id.keyword',
              total_coupon: '$total_coupon',
              synced_at: currentDate.toDate(),
              msisdn,
            },
          },
        },
        {
          $unset: 'latestData',
        },
        {
          $match: {
            'payload.keyword_id': { $exists: true },
          },
        },
        /**
         * exclude keyword that exist in transaction_inject_coupon_summary
         */
        // {
        //   $lookup: {
        //     from: 'transaction_inject_coupon_summary',
        //     let: {
        //       keywordName: '$payload.keyword_name',
        //       programName: '$payload.program_name',
        //     },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $and: [
        //               {
        //                 $eq: ['$msisdn', msisdn],
        //               },
        //               {
        //                 $eq: ['$program_name', '$$programName'],
        //               },
        //               {
        //                 $eq: ['$keyword_name', '$$keywordName'],
        //               },
        //             ],
        //           },
        //         },
        //       },
        //       {
        //         $project: {
        //           _id: 1,
        //           program_name: 1,
        //           keyword_name: 1,
        //           synced_at: 1,
        //         },
        //       },
        //     ],
        //     as: 'coupon_summary',
        //   },
        // },
        // {
        //   $match: {
        //     $or: [
        //       { coupon_summary: { $size: 0 } },
        //       { 'coupon_summary.synced_at': null },
        //     ],
        //   },
        // },
      ];
      console.log('SYNC SUMMARY PIPELINE', JSON.stringify(pipeline));

      const customerCouponSummaries = await this.trxInjectCoupon.aggregate(
        pipeline,
        {
          allowDiskUse: true,
        },
      );

      await this.bulkUpsertCoupons(customerCouponSummaries);

      await this.loggerReportStatistic(
        payload,
        false,
        `${step} success`,
        '',
        startProcess,
      );
    } catch (error) {
      const errorMessage = {
        message: error.message,
        stack: error.stack,
      };

      console.log('ERROR syncCustomerCouponSummary', errorMessage, '\n\n');

      await this.loggerReportStatistic(
        payload,
        true,
        `${step} error`,
        errorMessage,
        startProcess,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
