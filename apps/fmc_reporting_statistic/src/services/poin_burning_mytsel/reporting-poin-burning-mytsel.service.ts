import {
  Channel,
  ChannelDocument,
} from '@gateway/channel/models/channel.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import {
  DeductPoint,
  DeductPointDocument,
} from '../../../../../apps/deduct/src/models/deduct.point.model';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';

@Injectable()
export class ReportingPoinBurningMyTselService {
  constructor(
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
    @InjectModel(DeductPoint.name)
    private deductPointModel: Model<DeductPointDocument>,
  ) {}

  async reportingPoinBurningMyTselUpdate(payload: any) {
    console.log('payload agung', payload);

    // update summary
    const redeemer = await this.countPoinBurningMyTselReporting(payload, '');
    const redeemer_indihome = await this.countPoinBurningMyTselReporting(
      payload,
      '_indihome',
    );
    const redeemer_telco = await this.countPoinBurningMyTselReporting(
      payload,
      '_telco',
    );
    console.log(redeemer, 'redeemer my tsel burning agung');
    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: {
            $eq: new Date(payload.periodReport),
          },
        },
        {
          poin_burning_mytelkomsel: redeemer,
          poin_burning_mytelkomsel_telco: redeemer_telco,
          poin_burning_mytelkomsel_indihome: redeemer_indihome,
        },
      )
      .then((res) => {
        return res;
      });
  }
  // }

  /**
   * Private Function
   */

  private async countPoinBurningMyTselReporting(payload: any, identifier: any) {
    const dateLastYear = await this.countDateLastYear(payload, identifier);
    const dateLastMonth = await this.countDateLastMonth(payload, identifier);
    const dateToday = await this.countDateToday(payload, identifier);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async countDateLastYear(payload: any, identifier: any) {
    const end_period = moment(payload.periodReport)
      .subtract(1, 'years')
      .subtract(payload.subtract, 'days')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, identifier);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  private async countDateLastMonth(payload: any, identifier: any) {
    const end_period = moment(payload.periodReport)
      .subtract(1, 'months')
      .subtract(payload.subtract, 'days')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, identifier);

    return {
      name: 'Date Last Month',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  private async getReportOlderDate(period, identifier: any) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> POIN BURNING MYTSEL on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({
        period: {
          $eq: new Date(period),
        },
      });
      console.log('DATANYA', data);

      if (data) {
        if (identifier == '') {
          ress.year_to_date =
            data.poin_burning_mytelkomsel[
              data.poin_burning_mytelkomsel.length - 1
            ].year_to_date;
          ress.month_to_date =
            data.poin_burning_mytelkomsel[
              data.poin_burning_mytelkomsel.length - 1
            ].month_to_date;
        } else if (identifier == '_indihome') {
          ress.year_to_date =
            data.poin_burning_mytelkomsel_indihome[
              data.poin_burning_mytelkomsel_indihome.length - 1
            ].year_to_date;
          ress.month_to_date =
            data.poin_burning_mytelkomsel_indihome[
              data.poin_burning_mytelkomsel_indihome.length - 1
            ].month_to_date;
        } else if (identifier == '_telco') {
          ress.year_to_date =
            data.poin_burning_mytelkomsel_telco[
              data.poin_burning_mytelkomsel_telco.length - 1
            ].year_to_date;
          ress.month_to_date =
            data.poin_burning_mytelkomsel_telco[
              data.poin_burning_mytelkomsel_telco.length - 1
            ].month_to_date;
        }
      }

      console.log(
        `=>> POIN BURNING MYTSEL on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async countDateToday_replaced(payload: any, identifier: any) {
    const end_period = moment(payload.periodReport).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: {
        $eq: new Date(end_period),
      },
    });

    console.log('data report today : ', data.poin_burning_mytelkomsel);

    let year_to_date = 0;
    let month_to_date = 0;

    if (data) {
      if (identifier == '') {
        year_to_date =
          data.poin_burning_mytelkomsel[
            data.poin_burning_mytelkomsel.length - 1
          ].year_to_date;
        month_to_date =
          data.poin_burning_mytelkomsel[
            data.poin_burning_mytelkomsel.length - 1
          ].month_to_date;
      } else if (identifier == '_indihome') {
        year_to_date =
          data.poin_burning_mytelkomsel_indihome[
            data.poin_burning_mytelkomsel_indihome.length - 1
          ].year_to_date;
        month_to_date =
          data.poin_burning_mytelkomsel_indihome[
            data.poin_burning_mytelkomsel_indihome.length - 1
          ].month_to_date;
      } else if (identifier == '_telco') {
        year_to_date =
          data.poin_burning_mytelkomsel_telco[
            data.poin_burning_mytelkomsel_telco.length - 1
          ].year_to_date;
        month_to_date =
          data.poin_burning_mytelkomsel_telco[
            data.poin_burning_mytelkomsel_telco.length - 1
          ].month_to_date;
      }
    }

    return {
      name: 'Date Today',
      period: end_period,
      year_to_date: year_to_date,
      month_to_date: month_to_date,
    };
  }

  private async countDateToday(payload: any, identifier: any) {
    const end_period = moment(payload.periodReport).toISOString();

    return await this.counterTransaction(
      {
        period: end_period,
        report_name: 'Date Today',
        subtract: payload.subtract,
      },
      identifier,
    );
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

  private async counterTransaction(payload: any, identifier: any) {
    const startTime = new Date();

    const start_period = moment(payload.period)
      .subtract(payload.subtract, 'days')
      .startOf('days')
      .toDate();
    const end_period = moment(payload.period)
      .subtract(payload.subtract, 'days')
      .endOf('days')
      .toDate();

    const yesterday = moment(payload.period)
      .subtract(1 + payload.subtract, 'days')
      .format('YYYY-MM-DD');

    const count_yesterday = await this.getReportOlderDate(
      yesterday,
      identifier,
    );

    console.log('count_yesterday : ', count_yesterday);
    console.log('yesterday : ', yesterday);

    const channelNames = (
      await this.channelModel.find({ name: /MyTelkomsel/ })
    ).map((doc) => doc.code);

    const channelNamesRegex = channelNames.map((name) => new RegExp(name, 'i'));

    console.log('data mytsel : ', channelNamesRegex);
    let msisdn_filter = new RegExp(/^/, 'g');
    if (identifier == '_indihome') {
      msisdn_filter = new RegExp(/^1/, 'g');
    } else if (identifier == '_telco') {
      msisdn_filter = new RegExp(/^62/, 'g');
    }
    const query_today = [
      {
        $match: {
          transaction_date: {
            $gte: start_period,
            $lte: end_period,
          },
          channel_id: { $in: channelNamesRegex }, // Filter by MyTelkomsel channel names
          msisdn: {
            $regex: msisdn_filter,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSumPoin: {
            $sum: '$total_point',
          },
        },
      },
    ];

    console.log(`=>> Query Poin Burn: ${JSON.stringify(query_today)}`);
    const count_today = await this.deductPointModel.aggregate(query_today);

    console.log('count_today POIN BURN MYTSEL: ', count_today);
    console.log('startDate POIN BURN MYTSEL: ', start_period);
    console.log('endDate POIN BURN MYTSEL: ', end_period);

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

    if (count_today.length > 0 && count_today[0]['totalSumPoin']) {
      result.year_to_date += Math.abs(Number(count_today[0]['totalSumPoin']));
      result.month_to_date += Math.abs(Number(count_today[0]['totalSumPoin']));
    }

    console.log(`=>> Datanya: `, result);
    const endTime = new Date();
    console.log(
      `REPORTING POIN BURN MYTSEL = ${
        endTime.getTime() - startTime.getTime()
      } ms`,
    );

    return result;
  }

  // private async counterTransaction(payload: any) {
  //   const startTime = new Date();
  //   const end_period =
  //     payload.subtract === 0
  //       ? moment(payload.period).add(1, 'days')
  //       : moment(payload.period).subtract(payload.subtract - 1, 'days');
  //   console.log('payload.period :', payload.period);
  //   console.log('end_period :', end_period);
  //   const year_to_date = moment(end_period).startOf('year');
  //   const month_to_date = moment(end_period).startOf('month');

  //   const startDate = year_to_date.toDate(); // Convert to JavaScript Date object
  //   const monthDate = month_to_date.toDate(); // Convert to JavaScript Date object.toDate(); // Convert to JavaScript Date object
  //   const endDate = end_period.toDate(); // Convert to JavaScript Date object

  //   const channelNames = (
  //     await this.channelModel.find({ name: /MyTelkomsel/ })
  //   ).map((doc) => doc.code);

  //   console.log('data mytsel : ', channelNames);

  //   const queryYtd = [
  //     {
  //       $match: {
  //         transaction_date: {
  //           $gte: startDate,
  //           $lte: endDate,
  //         },
  //         channel_id: { $in: channelNames }, // Filter by MyTelkomsel channel names
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: null,
  //         totalSumPoin: {
  //           $sum: '$total_point',
  //         },
  //       },
  //     },
  //   ];

  //   const queryMtd = [
  //     {
  //       $match: {
  //         transaction_date: {
  //           $gte: monthDate,
  //           $lte: endDate,
  //         },
  //         channel_id: { $in: channelNames }, // Filter by MyTelkomsel channel names
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: null,
  //         totalSumPoin: {
  //           $sum: '$total_point',
  //         },
  //       },
  //     },
  //   ];

  //   const ytd = await this.deductPointModel.aggregate(queryYtd);

  //   const mtd = await this.deductPointModel.aggregate(queryMtd);

  //   console.log(`query ytd : ${JSON.stringify(queryYtd)}`);
  //   console.log(`query mtd : ${JSON.stringify(queryMtd)}`);

  //   const endTime = new Date();
  //   console.log(
  //     `REPORTING POIN BURNING MY TSEL = ${
  //       endTime.getTime() - startTime.getTime()
  //     } ms`,
  //   );

  //   console.log('startDate burning my tsel : ', startDate);
  //   console.log('endDate burning my tsel : ', endDate);
  //   console.log('monthDate burning my tsel : ', monthDate);
  //   console.log(ytd);
  //   console.log(mtd);
  //   console.log(ytd.length > 0);
  //   console.log(mtd.length > 0);
  //   console.log('end_period : ', end_period);

  //   const result = {
  //     name: payload.report_name,
  //     period: moment(payload.period)
  //       .subtract(payload.subtract, 'days')
  //       .format('YYYY-MM-DD'),
  //     year_to_date: ytd[0]?.totalSumPoin || 0, // Use the count from aggregation result
  //     month_to_date: mtd[0]?.totalSumPoin || 0, // Use the count from aggregation result
  //   };

  //   return result;
  // }
}
