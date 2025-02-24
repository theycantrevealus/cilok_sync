import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import {
  KeywordApprovalLog,
  KeywordApprovalLogDocument,
} from '@/keyword/models/keyword.approval.log';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';
import {
  ReportUniqueRewardLiveSystem,
  ReportUniqueRewardLiveSystemDocument,
} from '../../model/reward/unique.reward.live.system.model';
import {
  ReportUniqueRewardTransaction,
  ReportUniqueRewardTransactionDocument,
} from '../../model/reward/unique.reward.transaction.model';

@Injectable()
export class ReportingRewardService {
  constructor(
    @InjectModel(ReportUniqueRewardLiveSystem.name, 'reporting')
    private reportRewardLiveSystemModel: Model<ReportUniqueRewardLiveSystemDocument>,

    @InjectModel(ReportUniqueRewardTransaction.name, 'reporting')
    private reportRewardTransactionModel: Model<ReportUniqueRewardTransactionDocument>,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,

    @InjectModel(KeywordApprovalLog.name)
    private keywordApprovalLogModel: Model<KeywordApprovalLogDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,

    private appsService: ApplicationService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * General Function
   */
  private async pushIfNotExist(array, data) {
    if (data && array.indexOf(data) == -1) {
      array.push(data);
    }
  }

  private async createIfNotExist(model, classify, data) {
    const response = new GlobalTransactionResponse();

    const newData = await new model(data);
    const dataExistence = await model.findOne(data).then((res) => res);
    if (dataExistence) {
      // console.log(
      //   `Data Exist : (${dataExistence.period} -  ${dataExistence.type}, ${dataExistence.merchant}, ${dataExistence.keyword})`,
      // );

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Data Exist';
      response.transaction_classify = `DATA_EXIST_${classify}`;
      response.payload = {
        trace_id: true,
        data: dataExistence,
      };

      return response;
    }

    return await newData
      .save()
      .catch((e: BadRequestException) => {
        throw new BadRequestException(e.message); //Error untuk mongoose
      })
      .then(async (data) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = classify;
        response.payload = {
          trace_id: true,
          period: data.period,
          type: data.type,
          merchant: data.merchant,
          keyword: data.keyword,
        };

        return response;
      });
  }

  /**
   * Reporting Function
   */
  private async countTransactionReporting(payload: any) {
    const dateLastYear = await this.countTransactionReportingDateLastYear(
      payload,
    );

    const dateLastMonth = await this.countTransactionReportingDateLastMonth(
      payload,
    );

    const dateToday = await this.countTransactionReportingDateToday(payload);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async getReportOlderDate(period) {
    const start = Date.now();

    const ress = {
      merchant: 0,
      keyword: 0,
    };

    try {
      console.log(`=>> REWARD_TRX on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data?.reward_trx);

      if (data) {
        ress.merchant = data.reward_trx[2].merchant; // today
        ress.keyword = data.reward_trx[2].keyword; // today
      }

      console.log(
        `=>> REWARD_TRX on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async countTransactionReportingDateLastYear(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period);

    return {
      name: 'Date Last Year',
      period: end_period,
      merchant: data.merchant,
      keyword: data.keyword,
    };
  }

  private async countTransactionReportingDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period);

    return {
      name: 'Date Last Month',
      period: end_period,
      merchant: data.merchant,
      keyword: data.keyword,
    };
  }

  private async countTransactionReportingDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.counterTransaction({
      period: end_period,
      report_name: 'Date Today',
    });
  }

  private async counterTransaction(payload: any) {
    const start_period = moment(payload.period).startOf('days'); // .format('YYYY-MM-DD');
    const end_period = moment(payload.period).endOf('days'); // format('YYYY-MM-DD');

    const merchant = await this.counterGroup(
      start_period,
      end_period,
      'merchant_id',
    );

    const keyword = await this.counterGroup(
      start_period,
      end_period,
      'keyword',
    );

    let result;

    console.log('MERCHANT: ', merchant);
    console.log('KEYWORD: ', keyword);

    if (
      merchant.length > 0 &&
      merchant[0]['count'] &&
      keyword.length > 0 &&
      keyword[0].count
    ) {
      result = {
        name: payload.report_name,
        period: moment(end_period).format('YYYY-MM-DD'),
        merchant: merchant[0]['count'],
        keyword: keyword[0]['count'],
      };
    } else {
      result = {
        name: payload.report_name,
        period: moment(end_period).format('YYYY-MM-DD'),
        merchant: 0,
        keyword: 0,
      };
    }

    return result;
  }

  private async countTransactionReportingRewardLive(model, payload: any) {
    console.log('=== DATE LAST YEAR ===');
    const dateLastYear =
      await this.countTransactionReportingRewardLiveDateLastYear(
        model,
        payload,
      );

    console.log('=== DATE LAST MONTH ===');
    const dateLastMonth =
      await this.countTransactionReportingRewardLiveDateLastMonth(
        model,
        payload,
      );

    console.log('=== DATE TODAY ===');
    const dateToday = await this.countTransactionReportingRewardLiveDateToday(
      model,
      payload,
    );

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async countTransactionReportingRewardLiveDateLastYear(
    model,
    payload: any,
  ) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .toISOString();

    return await this.counterTransactionRewardLive(model, {
      period: end_period,
      report_name: 'Date Last Year',
    });
  }

  private async countTransactionReportingRewardLiveDateLastMonth(
    model,
    payload: any,
  ) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.counterTransactionRewardLive(model, {
      period: end_period,
      report_name: 'Date Last Month',
    });
  }

  private async countTransactionReportingRewardLiveDateToday(
    model,
    payload: any,
  ) {
    const end_period = moment(payload.period).toISOString();

    return await this.counterTransactionRewardLive(model, {
      period: end_period,
      report_name: 'Date Today',
    });
  }

  private async counterTransactionRewardLive(model, payload: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    let year_to_date = moment(end_period).startOf('year').format('YYYY-MM-DD');

    if (payload.report_name === 'Date Today') {
      year_to_date = end_period;
    }

    const merchant = await this.counterGroupKeyword(
      model,
      year_to_date,
      end_period,
      'eligibility.merchant',
    );

    const keyword = await this.counterGroupKeyword(
      model,
      year_to_date,
      end_period,
      'eligibility.name',
    );

    let result;

    if (
      merchant.length > 0 &&
      merchant[0]['count'] &&
      keyword.length > 0 &&
      keyword[0].count
    ) {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        merchant: merchant[0]['count'],
        keyword: keyword[0]['count'],
      };
    } else {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        merchant: 0,
        keyword: 0,
      };
    }

    console.log('Result :: Report Reward Live');
    console.log(result);
    return result;
  }

  private async counterGroup(from: any, to: any, column: string) {
    const query = [
      {
        $match: {
          transaction_date: {
            $gte: new Date(from),
            $lte: new Date(to),
          },
          status: 'Success',
        },
      },
      {
        $group: {
          _id: `$${column}`,
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ];

    console.log(`Query untuk '${column}': `, JSON.stringify(query));
    return await this.redeemModel.aggregate(query);
  }

  private async counterGroupKeyword(
    model: any,
    from: any,
    to: any,
    column: string,
  ) {
    console.log('=== REWARD LIVE :: DATE ===');
    console.log('from', from);
    console.log('to', to);
    console.log('=== REWARD LIVE :: DATE ===');

    const current_date = `${to}T${moment(new Date()).format('HH:mm:ss')}.000Z`;
    const query = [
      {
        $match: {
          ['eligibility.start_period']: {
            $lte: new Date(current_date),
          },
          ['eligibility.end_period']: {
            $gte: new Date(current_date),
          },
          is_draft: false,
          is_stoped: false,
          hq_approver: { $exists: true },
        },
      },
      {
        $group: {
          _id: `$${column}`,
        },
      },
      {
        $group: {
          _id: null,
          count: {
            $sum: 1,
          },
        },
      },
    ];

    console.log('');
    console.log(
      `--> Query Reporting Reward Live System (${column}) : `,
      JSON.stringify(query),
    );
    console.log('');

    return await model.aggregate(query);
  }

  async updateRewardReport(
    payload: any,
    with_reward_live = false,
  ): Promise<ReportingServiceResult> {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const reward_transaction = await this.countTransactionReporting(payload);
      let updated : any = {};
      updated = {...updated, reward_trx: reward_transaction};

      //old metode
      // const reward_live_system = await this.countTransactionReporting(
      //   this.keywordModel,
      //   payload,
      // );

      if (with_reward_live) {
        const reward_live_system =
          await this.countTransactionReportingRewardLive(
            this.keywordModel,
            payload,
          );

        updated = { ...updated, reward_live_system: reward_live_system };
      }

      await this.reportMonitoringModel
        .findOneAndUpdate(
          {
            period: payload.period,
          },
          updated,
        )
        .then((res) => {
          if (res) {
            console.log(
              'Reporting Monitoring Period ' +
                payload.period +
                ' is updated at !' +
                res['updated_at'],
            );
          }
          return res;
        });

      serviceResult.message = 'Success update reward report';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  /**
   * Live System
   */

  private async activeList() {
    const query = [];

    query.push({
      $lookup: {
        from: 'keywordapprovallogs',
        let: { keyword_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $unwind: '$status',
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              keyword: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $addFields: {
        lastApproval: {
          $arrayElemAt: ['$approval_log', -1],
        },
      },
    });

    query.push({
      $project: {
        _id: true,
        eligibility: true,
        approval_log: true,
        lastApproval: true,
      },
    });

    query.push({
      $match: {
        'eligibility.start_period': {
          $lte: new Date().toISOString(),
        },
        'eligibility.end_period': {
          $gte: new Date().toISOString(),
        },
        'lastApproval.status.set_value': {
          $regex: new RegExp('approved', 'i'),
        },
      },
    });

    return await this.keywordModel.aggregate(query, (err, result) => {
      return result;
    });
  }

  async createUniqueLiveSystemReport(period): Promise<ReportingServiceResult> {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const keywordActive = [];
      const merchantActive = [];

      const activeList = await this.activeList();
      for (let i = 0; i < activeList.length; i++) {
        const data = activeList[i];

        this.pushIfNotExist(keywordActive, data._id.toString());
        this.pushIfNotExist(merchantActive, data.eligibility.merchant);
      }

      // merchant
      for (let m = 0; m < merchantActive.length; m++) {
        const merchant = merchantActive[m];

        await this.createIfNotExist(
          this.reportRewardLiveSystemModel,
          'UNIQUE_REWARD_LIVE_SYSTEM_REPORT',
          {
            period: period.slice(0, 10),
            type: 'Merchant',
            merchant: merchant,
            keyword: null,
          },
        );
      }

      // keyword
      for (let k = 0; k < keywordActive.length; k++) {
        const keyword = keywordActive[k];

        await this.createIfNotExist(
          this.reportRewardLiveSystemModel,
          'UNIQUE_REWARD_LIVE_SYSTEM_REPORT',
          {
            period: period.slice(0, 10),
            type: 'Keyword',
            merchant: null,
            keyword: keyword,
          },
        );
      }

      serviceResult.message = 'Success create unique live system report';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  /**
   * Transaction
   */
  async createUniqueRewardTransactionReport({
    period,
    type,
    merchant,
    keyword,
  }: ReportUniqueRewardTransaction): Promise<GlobalTransactionResponse> {
    return this.createIfNotExist(
      this.reportRewardTransactionModel,
      'UNIQUE_REWARD_TRANSACTION_REPORT',
      {
        period: period.slice(0, 10),
        type: type,
        merchant: merchant,
        keyword: keyword,
      },
    );
  }
}
