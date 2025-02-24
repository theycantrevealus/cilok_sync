import {
  Channel,
  ChannelDocument,
} from '@gateway/channel/models/channel.model';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.daily.model';
import {
  MonthlyReportUniqueMSISDN,
  MonthlyReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.monthly.model';
import {
  YearlyReportUniqueMSISDN,
  YearlyReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.yearly.model';

@Injectable()
export class ReportRedeemerMyTselService {
  constructor(
    @InjectModel(ReportUniqueMSISDN.name, 'reporting')
    private dailyReportModel: Model<ReportUniqueMSISDNDocument>,
    @InjectModel(MonthlyReportUniqueMSISDN.name, 'reporting')
    private monthlyReportModel: Model<MonthlyReportUniqueMSISDNDocument>,
    @InjectModel(YearlyReportUniqueMSISDN.name, 'reporting')
    private yearlyReportModel: Model<YearlyReportUniqueMSISDNDocument>,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,

    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
  ) {}

  private async incRedeemerMyTelkomsel(payload) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const end_period_month = moment(payload.date).format('YYYY-MM');
    const end_period_year = moment(payload.date).format('YYYY');

    await this.dailyReportModel.findOneAndUpdate(
      {
        msisdn: payload.msisdn,
        period: end_period,
      },
      {
        $inc: { 'redeem_channel.my_telkomsel': 1 },
        updated_at: new Date(),
      },
    );

    await this.monthlyReportModel.findOneAndUpdate(
      {
        msisdn: payload.msisdn,
        period: end_period_month,
      },
      {
        $inc: { 'redeem_channel.my_telkomsel': 1 },
        updated_at: new Date(),
      },
    );

    await this.yearlyReportModel.findOneAndUpdate(
      {
        msisdn: payload.msisdn,
        period: end_period_year,
      },
      {
        $inc: { 'redeem_channel.my_telkomsel': 1 },
        updated_at: new Date(),
      },
    );
  }

  async reportingRedeemerMyTselUpdate(payload: any) {
    // TODO : Need Configurable payload.parameter.channel
    const data = await this.channelModel.find({ name: /MyTelkomsel/ });
    const filteredData = data.filter((doc) => doc.code === payload.channel);

    if (filteredData.length) {
      // generate
      await this.incRedeemerMyTelkomsel(payload);

      // update summary
      const redeemer = await this.countRedeemReporting(payload);
      const newData = await this.reportMonitoringModel
        .findOneAndUpdate(
          {
            period: payload.period,
          },
          {
            redeemer_mytelkomsel: redeemer,
          },
        )
        .then((res) => {
          return res;
        });
    }
  }

  /**
   * Private Function
   */

  private async countRedeemReporting(payload: any) {
    const dateLastYear = await this.countDateLastYear(payload);
    const dateLastMonth = await this.countDateLastMonth(payload);
    const dateToday = await this.countDateToday(payload);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async countDateLastYear(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .toISOString();

    return await this.counterTransaction({
      period: end_period,
      report_name: 'Date Last Year',
    });
  }

  private async countDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.counterTransaction({
      period: end_period,
      report_name: 'Date Last Month',
    });
  }

  private async countDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.counterTransaction({
      period: end_period,
      report_name: 'Date Today',
    });
  }

  private async counterTransaction(payload: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const year_to_date = moment(end_period)
      .startOf('year')
      .format('YYYY-MM-DD');
    const month_to_date = moment(end_period)
      .startOf('month')
      .format('YYYY-MM-DD');

    const count_ytd = await this.dailyReportModel
      .aggregate([
        {
          $match: {
            period: {
              $gte: year_to_date,
              $lte: end_period,
            },
            'redeem_channel.my_telkomsel': {
              $gt: 0,
            },
          },
        },
        {
          $group: {
            _id: '$msisdn',
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
      ])
      .exec();

    const count_mtd = await this.dailyReportModel
      .aggregate([
        {
          $match: {
            period: {
              $gte: month_to_date,
              $lte: end_period,
            },
            'redeem_channel.my_telkomsel': {
              $gt: 0,
            },
          },
        },
        {
          $group: {
            _id: '$msisdn',
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
      ])
      .exec();

    let result;
    if (
      count_ytd.length > 0 &&
      count_mtd.length > 0 &&
      count_mtd[0]['count'] &&
      count_mtd[0]['count']
    ) {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        year_to_date: count_ytd[0]['count'],
        month_to_date: count_mtd[0]['count'],
      };
    } else {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        year_to_date: 0,
        month_to_date: 0,
      };
    }

    return result;
  }
}
