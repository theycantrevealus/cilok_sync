import {
  Channel,
  ChannelDocument,
} from '@gateway/channel/models/channel.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';

@Injectable()
export class ReportingUniqueMsisdnMyTselService {
  constructor(
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,

    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async reportingMonitoringUpdate(payload: any) {
    const result = await this.countRedeemReporting(payload);

    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          redeemer_mytelkomsel: result.redeemer,
        },
      )
      .then((res) => {
        console.log(
          'Reporting Monitoring Period ' +
            payload.period +
            ' is updated at !' +
            res['updated_at'],
        );
        return res;
      });

    return newData;
  }

  async countRedeemReporting(payload: any) {
    const dateLastYear = await this.countDateLastYear(payload);
    const dateLastMonth = await this.countDateLastMonth(payload);
    const dateToday = await this.countDateToday(payload);

    const result = {
      redeemer: [dateLastYear, dateLastMonth, dateToday],
    };
    return await result;
  }

  async countDateLastYear(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  async countDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period);

    return {
      name: 'Date Last Month',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  private async getReportOlderDate(period) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> REDEEMER MYTELKOMSEL on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data?.redeemer_mytelkomsel);

      if (data) {
        ress.year_to_date = data.redeemer_mytelkomsel[2].year_to_date; // today
        ress.month_to_date = data.redeemer_mytelkomsel[2].month_to_date; // today
      }

      console.log(
        `=>> REDEEMER MYTELKOMSEL on ${period} Exec time: ${
          Date.now() - start
        }`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async isFirstDay(period, type) {
    if (type == 'mtd') {
      if (moment(period).format('DD') == '01') {
        return true;
      }
    } else if (type == 'ytd') {
      if (moment(period).format('DD-MM') == '01-01') {
        return true;
      }
    }

    return false;
  }

  async countDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();
    if (payload.historyData) {
      const data = await this.reportMonitoringModel.findOne({
        period: moment(end_period).format('YYYY-MM-DD'),
      });
      console.log('data report today : ', data.redeemer_mytelkomsel);
      let year_to_date = 0;
      let month_to_date = 0;
      year_to_date = data.redeemer_mytelkomsel[2].year_to_date; // today
      month_to_date = data.redeemer_mytelkomsel[2].month_to_date; // today
      const result = {
        name: 'Date Today',
        period: moment(end_period).format('YYYY-MM-DD'),
        year_to_date: year_to_date,
        month_to_date: month_to_date,
      };
      return result;
    } else {
      return await this.counter({
        period: end_period,
        report_name: 'Date Today',
      });
    }
  }

  async counter(payload: any) {
    const start = Date.now();

    const start_period = moment(payload.period).startOf('days').toDate();
    const end_period = moment(payload.period).endOf('days').toDate();

    const yesterday = moment(payload.period)
      .subtract(1, 'days')
      .format('YYYY-MM-DD');

    const count_yesterday = await this.getReportOlderDate(yesterday);

    const channelNames = (
      await this.channelModel.find({ name: /MyTelkomsel/ })
    ).map((doc) => doc.code);
    const channelNamesRegex = channelNames.map((name) => new RegExp(name, 'i'));

    console.log('data mytsel : ', channelNamesRegex);

    console.log(
      `=>> REDEEMER_MYTELKOMSEL on (${payload.report_name}) ${end_period} Start!`,
    );

    const query_today = [
      {
        $match: {
          transaction_date: {
            $gte: start_period,
            $lte: end_period,
          },
          channel_id: { $in: channelNamesRegex }, // Filter by MyTelkomsel channel names
          status: 'Success', // Filter by status 'Success'
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
    ];

    console.log(
      '=>> Query Redeemer MyTelkomsel: ',
      JSON.stringify(query_today),
    );
    const count_today = await this.redeemModel.aggregate(query_today);

    const result = {
      name: payload.report_name,
      period: moment(end_period).format('YYYY-MM-DD'),
      year_to_date: (await this.isFirstDay(payload.period, 'ytd'))
        ? 0
        : count_yesterday.year_to_date,
      month_to_date: (await this.isFirstDay(payload.period, 'mtd'))
        ? 0
        : count_yesterday.month_to_date,
    };

    if (count_today.length > 0 && count_today[0]['count']) {
      result.year_to_date += Number(count_today[0]['count']);
      result.month_to_date += Number(count_today[0]['count']);
    }

    console.log(`=>> Datanya: `, result);
    console.log(
      `=>> REDEEMER_MYTELKOMSEL on (${
        payload.report_name
      }) ${end_period} Exec time: ${Date.now() - start}`,
    );

    return result;
  }
}
