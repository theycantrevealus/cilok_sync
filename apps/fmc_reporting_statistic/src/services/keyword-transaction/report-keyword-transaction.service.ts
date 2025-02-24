import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ReportKeywordTransaction,
  ReportKeywordTransactionDocument,
} from '../../model/keyword-transaction/report-keyword-transaction.model';
import { ReportingNotificationService } from '../reporting_notification/reporting-notification.service';

const moment = require('moment-timezone');

@Injectable()
export class ReportKeywordTransactionService {
  constructor(
    @InjectModel(ReportKeywordTransaction.name, 'reporting')
    private reportKeywordTransactionModel: Model<ReportKeywordTransactionDocument>,
    private reportingNotificationService: ReportingNotificationService,
  ) {
    //
  }

  async reportKeywordTransactionStore(param: any) {
    const today = moment().format('YYYY-MM-DD');
    const transactionStatusSuccess =
      param.transaction_status.toUpperCase() === 'SUCCESS' ? 1 : 0;
    const checkExistingData = await this.reportKeywordTransactionModel
      .findOne({
        created_at: {
          $gte: today,
        },
        program_name: param.program_name,
        keyword_name: param.keyword_name,
      })
      .exec();
    if (!checkExistingData) {
      const rowData = new this.reportKeywordTransactionModel({
        total_success: transactionStatusSuccess,
        total_fail: !transactionStatusSuccess,
        total_trx: 1,
        keyword_name: param.keyword_name,
        program_name: param.program_name,
        start_period: param.start_period,
        end_period: param.end_period,
      });
      rowData.save().catch((e: Error) => {
        throw new Error(e.message);
      });
    } else {
      await this.reportKeywordTransactionModel.findOneAndUpdate(
        {
          keyword_name: param.keyword_name,
          program_name: param.program_name,
          created_at: {
            $gte: today,
          },
        },
        {
          $inc: {
            total_success: transactionStatusSuccess,
            total_fail: !transactionStatusSuccess,
            total_trx: 1,
          },
          updated_at: moment(),
        },
      );
    }
  }

  async reportKeywordTransactionGet(date: any, filter: any): Promise<any> {
    const start_date = date?.start_date ?? new Date();
    const end_date = date?.end_date ?? new Date();
    return await this.reportKeywordTransactionModel
      .find(
        {
          ...filter,
          created_at: {
            $gte: moment(start_date).startOf('day').toDate(),
            $lte: moment(end_date).endOf('day').toDate(),
          },
        },
        {
          _id: false,
          created_at: true,
          program_name: true,
          keyword_name: true,
          total_success: true,
          total_fail: true,
          total_trx: true,
        },
      )
      .exec();
  }

  async reportKeywordTransactionGroupingGet(
    date: any,
    filter: any,
  ): Promise<any> {
    const start_date = date?.start_date ?? new Date();
    const end_date = date?.end_date ?? new Date();
    return this.reportKeywordTransactionModel.aggregate([
      {
        $match: {
          ...filter,
          created_at: {
            $gte: moment(start_date).startOf('day').toDate(),
            $lte: moment(end_date).endOf('day').toDate(),
          },
        },
      },
      {
        $group: {
          _id: { keyword_name: '$keyword_name' },
          total_success: { $sum: '$total_success' },
          total_fail: { $sum: '$total_fail' },
          total_trx: { $sum: '$total_trx' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          created_at: 1,
          keyword_name: '$_id.keyword_name',
          total_success: 1,
          total_fail: 1,
          total_trx: 1,
        },
      },
    ]);
  }
}
