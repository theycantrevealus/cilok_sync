import {HttpStatus, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import mongoose, {Model, Types} from 'mongoose';

import {
  ReportTrendErrorRedeem,
  ReportTrendErrorRedeemDocument,
} from '../../model/error-redeemer-trends/report-trend-error-redeem.model';

const moment = require('moment-timezone');

@Injectable()
export class ReportTrendErrorRedeemService {
  constructor(
    @InjectModel(ReportTrendErrorRedeem.name, 'reporting')
    private reportTrendErrorRedeemModel: Model<ReportTrendErrorRedeemDocument>,
  ) {
    //
  }

  async reportTrendErrorRedeemStore(param: any) {
    const today = moment().format('YYYY-MM-DD');
    const checkExistingData = await this.reportTrendErrorRedeemModel
      .findOne({
        created_at: {
          $gte: today,
        },
        program_name: param.program_name,
        keyword_name: param.keyword_name,
        log_event: param.log_event,
      })
      .exec();
    if (!checkExistingData) {
      const rowData = new this.reportTrendErrorRedeemModel({
        program_name: param.program_name,
        keyword_name: param.keyword_name,
        log_event: param.log_event,
        notification_content: param.notification_content,
        total: 1,
        start_period: param.start_period,
        end_period: param.end_period,
      });
      rowData.save().catch((e: Error) => {
        throw new Error(e.message);
      });
    } else {
      await this.reportTrendErrorRedeemModel.findOneAndUpdate(
        {
          keyword_name: param.keyword_name,
          program_name: param.program_name,
          created_at: {
            $gte: today,
          },
        },
        {
          $inc: {
            total: 1,
          },
          updated_at: moment(),
        },
      );
    }
  }

  async reportTrendErrorRedeemGet(date: any, filter: any): Promise<any> {
    const start_date = date?.start_date ?? new Date();
    const end_date = date?.end_date ?? new Date();
    return await this.reportTrendErrorRedeemModel
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
          log_event: true,
          notification_content: true,
          total: true,
        },
      )
      .sort({total: -1})
      .limit(10)
      .exec();
  }
}
