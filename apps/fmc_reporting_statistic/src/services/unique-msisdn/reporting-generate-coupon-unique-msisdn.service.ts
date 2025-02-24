import {
  TransactionMasterDetail,
  TransactionMasterDetailDocument,
} from '@fmc_reporting_statistic/model/trx-master-detail.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CouponGenerateUniqueMsisdn,
  CouponGenerateUniqueMsisdnDocument,
} from '../../model/unique_msisdn/coupon.generate.unique.msisdn.daily.model';
import {
  MsisdnRedeemTransactionTemp,
  MsisdnRedeemTransactionTempDocument,
} from '../../model/unique_msisdn/msisdn.redeem.transaction.temp';

const moment = require('moment-timezone');
const today = moment().format('YYYY-MM-DD');

@Injectable()
export class ReportingGenerateCouponUniqueMsisdnService {
  constructor(
    @InjectModel(CouponGenerateUniqueMsisdn.name, 'reporting')
    private couponGenerateUniqueMsisdnModel: Model<CouponGenerateUniqueMsisdnDocument>,
    @InjectModel(MsisdnRedeemTransactionTemp.name, 'reporting')
    private msisdnRedeemTransactionTempModel: Model<MsisdnRedeemTransactionTempDocument>,
    @InjectModel(TransactionMasterDetail.name)
    private transactionMasterDetailDocumentModel: Model<TransactionMasterDetailDocument>,
  ) {
    //
  }

  async couponGenerateUniqueMsisdnStore(param: any) {
    const msisdn = param.msisdn;

    const program_name = param.program_name;
    const start_period = param.start_period;
    const end_period = param.end_period;
    const checkMsisdn = await this.msisdnRedeemTransactionTempModel
      .findOne({
        created_at: {
          $gte: today,
        },
        program_name: program_name,
        msisdn: msisdn,
      })
      .exec();
    if (!checkMsisdn) {
      const rowData = new this.msisdnRedeemTransactionTempModel({
        msisdn: msisdn,
        program_name: program_name,
      });
      rowData.save().catch((e: Error) => {
        // this.logger.error(e);
        console.error(e);
      });
    }
    const checkExistingData = await this.couponGenerateUniqueMsisdnModel
      .findOne({
        created_at: {
          $gte: today,
        },
        program_name: program_name,
      })
      .exec();
    if (!checkExistingData) {
      const rowData = new this.couponGenerateUniqueMsisdnModel({
        program_name: program_name,
        start_period: start_period,
        end_period: end_period,
        total_coupon: 1,
        total_msisdn: 1,
      });
      rowData.save().catch((e: Error) => {
        // this.logger.error(e);
        console.log(e);
      });
    } else {
      const msisdnCount = await this.msisdnRedeemTransactionTempModel
        .find({
          created_at: {
            $gte: today,
          },
          program_name: program_name,
        })
        .count();
      await this.couponGenerateUniqueMsisdnModel.findOneAndUpdate(
        {
          created_at: {
            $gte: today,
          },
          program_name: program_name,
        },
        {
          $inc: {
            total_coupon: 1,
          },
          total_msisdn: msisdnCount,
          updated_at: moment(),
        },
      );
    }
  }

  //
  // async couponGenerateUniqueMsisdnGetV1(date: any, filter: any): Promise<any> {
  //   const start_date = date?.start_date ?? new Date();
  //   const end_date = date?.end_date ?? new Date();
  //   return this.couponGenerateUniqueMsisdnModel.find(
  //     {
  //       ...filter,
  //       created_at: {
  //         $gte: moment(start_date).startOf('day').toDate(),
  //         $lte: moment(end_date).endOf('day').toDate(),
  //       },
  //     },
  //     {
  //       _id: false,
  //       created_at: true,
  //       program_name: true,
  //       total_coupon: true,
  //       total_msisdn: true,
  //     },
  //   );
  // }

  async couponGenerateUniqueMsisdnGetV2(date, filter: any) {
    const start_date = date?.start_date ?? new Date().toISOString();
    const end_date = date?.end_date ?? new Date().toISOString();
    console.log('date', start_date);
    console.log('start date', moment(start_date).startOf('day').toISOString());
    console.log('end date', moment(end_date).endOf('day').toISOString());
    console.log('filter', filter);
    const data = await this.transactionMasterDetailDocumentModel.aggregate([
      {
        $match: {
          'payload.program.name': filter.program_name,
          'payload.transaction_status': 'Success',
          'payload.payload.coupon.type': 'Coupon',
          'payload.redeem.created_at': {
            $gte: moment(start_date).startOf('day').toISOString(),
            $lte: moment(end_date).endOf('day').toISOString(),
          },
        },
      },
      {
        $facet: {
          msisdn: [
            {
              $group: {
                _id: { msisdn: '$payload.redeem.msisdn' },
              },
            },
            { $count: 'msisdn' },
          ],
          total: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          total_msisdn: { $arrayElemAt: ['$msisdn.msisdn', 0] },
          total_coupon: { $arrayElemAt: ['$total.count', 0] },
        },
      },
    ]);
    console.log(data);
    return data;
  }
}
