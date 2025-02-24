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
export class ReportTransactionBurningService {
  constructor(
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
  ) {}

  // private async incTrxBurningMyTelkomsel(payload) {
  //   const end_period = moment(payload.period).format('YYYY-MM-DD');
  //   const end_period_month = moment(payload.date).format('YYYY-MM');
  //   const end_period_year = moment(payload.date).format('YYYY');

  //   await this.dailyReportModel.findOneAndUpdate(
  //     {
  //       msisdn: payload.msisdn,
  //       period: end_period,
  //     },
  //     {
  //       $inc: { 'trx_burn_channel.my_telkomsel': 1 },
  //       updated_at: new Date(),
  //     },
  //   );

  //   await this.monthlyReportModel.findOneAndUpdate(
  //     {
  //       msisdn: payload.msisdn,
  //       period: end_period_month,
  //     },
  //     {
  //       $inc: { 'trx_burn_channel.my_telkomsel': 1 },
  //       updated_at: new Date(),
  //     },
  //   );

  //   await this.yearlyReportModel.findOneAndUpdate(
  //     {
  //       msisdn: payload.msisdn,
  //       period: end_period_year,
  //     },
  //     {
  //       $inc: { 'trx_burn_channel.my_telkomsel': 1 },
  //       updated_at: new Date(),
  //     },
  //   );
  // }

  async reportingRedeemerUpdate(payload: any) {
    // const data = await this.channelModel.find({ name: /MyTelkomsel/ });
    // const filteredData = data.filter((doc) => doc.code === payload.channel);

    // if (filteredData.length) {
    // generate
    // await this.incTrxBurningMyTelkomsel(payload);

    // update summary
    const redeemer = await this.countTrxBurningReporting(payload, '');
    const redeemer_telco = await this.countTrxBurningReporting(
      payload,
      '_telco',
    );
    const redeemer_indihome = await this.countTrxBurningReporting(
      payload,
      '_indihome',
    );
    console.log('trx burn : ', redeemer);
    await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: {
            $eq: new Date(payload.period),
          },
        },
        {
          trx_burn: redeemer,
          trx_burn_telco: redeemer_telco,
          trx_burn_indihome: redeemer_indihome,
        },
      )
      .then((res) => {
        return res;
      });
    // }
  }

  /**
   * Private Function
   */

  private async countTrxBurningReporting(payload: any, identifier: any) {
    const dateLastYear = await this.countDateLastYear(payload, identifier);
    const dateLastMonth = await this.countDateLastMonth(payload, identifier);
    const dateToday = await this.countDateToday(payload, identifier);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async countDateLastYear(payload: any, identifier: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
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
    const end_period = moment(payload.period)
      .subtract(1, 'months')
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
      console.log(`=>> TRX BURNING on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data);

      if (data) {
        if (identifier == '') {
          ress.year_to_date =
            data.trx_burn[data.trx_burn.length - 1].year_to_date;
          ress.month_to_date =
            data.trx_burn[data.trx_burn.length - 1].month_to_date;
        } else if (identifier == '_indihome') {
          ress.year_to_date =
            data.trx_burn_indihome[
              data.trx_burn_indihome.length - 1
            ].year_to_date;
          ress.month_to_date =
            data.trx_burn_indihome[
              data.trx_burn_indihome.length - 1
            ].month_to_date;
        } else if (identifier == '_telco') {
          ress.year_to_date =
            data.trx_burn_telco[data.trx_burn_telco.length - 1].year_to_date;
          ress.month_to_date =
            data.trx_burn_telco[data.trx_burn_telco.length - 1].month_to_date;
        }
      }

      console.log(
        `=>> TRX BURNING on ${period} Exec time: ${Date.now() - start}`,
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

  private async countDateToday_replaced(payload, identifier: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: {
        $eq: new Date(end_period),
      },
    });

    console.log('data report today : ', data.trx_burn);

    let year_to_date = 0;
    let month_to_date = 0;

    if (data) {
      if (identifier == '') {
        year_to_date = data.trx_burn[data.trx_burn.length - 1].year_to_date;
        month_to_date = data.trx_burn[data.trx_burn.length - 1].month_to_date;
      } else if (identifier == '_indihome') {
        year_to_date =
          data.trx_burn_indihome[data.trx_burn_indihome.length - 1]
            .year_to_date;
        month_to_date =
          data.trx_burn_indihome[data.trx_burn_indihome.length - 1]
            .month_to_date;
      } else if (identifier == '_telco') {
        year_to_date =
          data.trx_burn_telco[data.trx_burn_telco.length - 1].year_to_date;
        month_to_date =
          data.trx_burn_telco[data.trx_burn_telco.length - 1].month_to_date;
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
    const end_period = moment(payload.period).toISOString();

    return await this.counterTransaction(
      {
        period: end_period,
        report_name: 'Date Today',
      },
      identifier,
    );
  }

  private async counterTransaction(payload: any, identifier: any) {
    const startTime = new Date();

    const start_period = moment(payload.period).startOf('days').toDate();
    const end_period = moment(payload.period).endOf('days').toDate();

    const yesterday = moment(payload.period)
      .subtract(1, 'days')
      .format('YYYY-MM-DD');

    const count_yesterday = await this.getReportOlderDate(
      yesterday,
      identifier,
    );
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
          msisdn: {
            $regex: msisdn_filter,
          },
          status: 'Success', // Filter by status 'Success'
        },
      },
      {
        $count: 'totalSuccess', // Count the number of documents
      },
    ];

    console.log(`=>> Query Trx Burn: ${JSON.stringify(query_today)}`);
    const count_today = await this.redeemModel.aggregate(query_today);

    console.log('startDate TRX BURN: ', start_period);
    console.log('endDate TRX BURN: ', end_period);

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

    if (count_today.length > 0 && count_today[0]['totalSuccess']) {
      result.year_to_date += Number(count_today[0]['totalSuccess']);
      result.month_to_date += Number(count_today[0]['totalSuccess']);
    }

    console.log(`=>> Datanya: `, result);
    const endTime = new Date();
    console.log(
      `REPORTING TRX BURN  = ${endTime.getTime() - startTime.getTime()} ms`,
    );

    return result;
  }

  // private async counterTransaction(payload: any) {
  //   const end_period = moment(payload.period).format('YYYY-MM-DD');
  //   const year_to_date = moment(end_period)
  //     .startOf('year')
  //     .format('YYYY-MM-DD');
  //   const month_to_date = moment(end_period)
  //     .startOf('month')
  //     .format('YYYY-MM-DD');

  //   // benerin logic --> pak wilyu
  //   // const count_ytd = await this.dailyReportModel
  //   //   .aggregate([
  //   //     {
  //   //       $match: {
  //   //         period: {
  //   //           $gte: year_to_date,
  //   //           $lte: end_period,
  //   //         },
  //   //       },
  //   //     },
  //   //     {
  //   //       $addFields: {
  //   //         trx_burn_mytsel: '$trx_burn_channel.my_telkomsel',
  //   //       },
  //   //     },
  //   //     {
  //   //       $group: {
  //   //         _id: '$msisdn',
  //   //         trx_burn_mytsel: {
  //   //           $sum: {
  //   //             $multiply: ['$trx_burn_mytsel'],
  //   //           },
  //   //         },
  //   //       },
  //   //     },
  //   //     {
  //   //       $group: {
  //   //         _id: null,
  //   //         count: {
  //   //           $sum: 1,
  //   //         },
  //   //         count_trx_burn_my_tsel: {
  //   //           $sum: '$trx_burn_mytsel',
  //   //         },
  //   //       },
  //   //     },
  //   //   ])
  //   //   .exec();

  //   // const count_mtd = await this.dailyReportModel
  //   //   .aggregate([
  //   //     {
  //   //       $match: {
  //   //         period: {
  //   //           $gte: month_to_date,
  //   //           $lte: end_period,
  //   //         },
  //   //       },
  //   //     },
  //   //     {
  //   //       $addFields: {
  //   //         trx_burn_mytsel: '$trx_burn_channel.my_telkomsel',
  //   //       },
  //   //     },
  //   //     {
  //   //       $group: {
  //   //         _id: '$msisdn',
  //   //         trx_burn_mytsel: {
  //   //           $sum: {
  //   //             $multiply: ['$trx_burn_mytsel'],
  //   //           },
  //   //         },
  //   //       },
  //   //     },
  //   //     {
  //   //       $group: {
  //   //         _id: null,
  //   //         count: {
  //   //           $sum: 1,
  //   //         },
  //   //         count_trx_burn_my_tsel: {
  //   //           $sum: '$trx_burn_mytsel',
  //   //         },
  //   //       },
  //   //     },
  //   //   ])
  //   //   .exec();

  //   const count_ytd = [];
  //   const count_mtd = [];

  //   let result;
  //   if (
  //     count_ytd.length > 0 &&
  //     count_mtd.length > 0 &&
  //     count_mtd[0]['count_trx_burn_my_tsel'] &&
  //     count_ytd[0]['count_trx_burn_my_tsel']
  //   ) {
  //     result = {
  //       name: payload.report_name,
  //       period: end_period.slice(0, 10),
  //       year_to_date: count_ytd[0]['count_trx_burn_my_tsel'],
  //       month_to_date: count_mtd[0]['count_trx_burn_my_tsel'],
  //     };
  //   } else {
  //     result = {
  //       name: payload.report_name,
  //       period: end_period.slice(0, 10),
  //       year_to_date: 0,
  //       month_to_date: 0,
  //     };
  //   }

  //   return result;
  // }
}
