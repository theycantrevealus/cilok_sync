import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from 'apps/reporting_statistic/src/model/reporting.model';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNDocument,
} from 'apps/reporting_statistic/src/model/unique_msisdn/unique.msisdn.daily.model';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

@Injectable()
export class ReportingRedeemerExistingService {
  constructor(
    @InjectModel(ReportUniqueMSISDN.name)
    private reportModel: Model<ReportUniqueMSISDNDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
  ) {}

  async reportingMonitoringUpdate(payload: any) {
    const redeemer = await this.countRedeemReporting(payload);

    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          redeemer_existing: redeemer,
        },
      )
      .then((res) => {
        console.log(
          'Reporting Monitoring Period ' +
            payload.period +
            ' is updated at !' +
            res['updated_at'],
        );
        console.log('Redeemer Existing');
        return res;
      });

    return newData;
  }

  async countRedeemReporting(payload: any) {
    const dateLastYear = await this.countDateLastYear(payload);
    const dateLastMonth = await this.countDateLastMonth(payload);
    const dateToday = await this.countDateToday(payload);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  async countDateLastYear(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .toISOString();

    return await this.counter({
      period: end_period,
      report_name: 'Date Last Year',
    });
  }

  async countDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.counter({
      period: end_period,
      report_name: 'Date Last Month',
    });
  }

  async countDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.counter({
      period: end_period,
      report_name: 'Date Today',
    });
  }

  async counter(payload: any) {
    const startDate1 = moment(payload.period)
      .startOf('year')
      .format('YYYY-MM-DD');
    const endDate1 = moment(payload.period).format('YYYY-MM-DD');
    const startDate2 = moment(payload.period)
      .startOf('month')
      .format('YYYY-MM-DD');
    const endDate2 = moment(payload.period).format('YYYY-MM-DD');

    // benerin logic --> pak wilyu
    // const count = await this.reportModel
    //   .aggregate([
    //     {
    //       $match: {
    //         period: {
    //           $gte: startDate1,
    //           $lte: endDate2,
    //         },
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: '$msisdn',
    //         count: {
    //           $sum: 1,
    //         },
    //         periods: {
    //           $push: '$period',
    //         },
    //       },
    //     },
    //     {
    //       $match: {
    //         count: {
    //           $gt: 0,
    //         },
    //         periods: {
    //           $elemMatch: {
    //             $gte: startDate1,
    //             $lte: endDate2,
    //           },
    //         },
    //       },
    //     },
    //     {
    //       $count: 'total_unique_msisdn',
    //     },
    //   ])
    //   .exec();

    const count = [];

    const result = {
      name: payload.report_name,
      period: endDate2.slice(0, 10),
      year_to_date: count.length > 0 ? count[0].total_unique_msisdn : 0,
    };

    return result;
  }
}
