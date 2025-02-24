import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';
import {
  ReportUniqueMSISDN,
  ReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.daily.model';

@Injectable()
export class ReportingRedeemerExistingService {
  constructor(
    @InjectModel(ReportUniqueMSISDN.name, 'reporting')
    private reportModel: Model<ReportUniqueMSISDNDocument>,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,

    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
  ) {}

  async reportingMonitoringUpdate(payload: any) {
    const redeemer = await this.countRedeemReporting(payload, '');
    const redeemer_indihome = await this.countRedeemReporting(
      payload,
      '_indihome',
    );
    const redeemer_telco = await this.countRedeemReporting(payload, '_telco');
    console.log('REDEEMER EXISTING: ', redeemer);

    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          redeemer_existing: redeemer,
          redeemer_existing_telco: redeemer_telco,
          redeemer_existing_indihome: redeemer_indihome,
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

  async countRedeemReporting(payload: any, identifier: any) {
    const dateLastYear = await this.countDateLastYear(payload, identifier);
    const dateLastMonth = await this.countDateLastMonth(payload, identifier);
    const dateToday = await this.countDateToday(payload, identifier);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return result;
  }

  private async getReportOlderDate(period, identifier: any) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
    };

    try {
      console.log(`=>> REDEEMER EXISTING on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data);

      if (data) {
        if (identifier == '') {
          ress.year_to_date =
            data.redeemer_existing[
              data.redeemer_existing.length - 1
            ].year_to_date;
        } else if (identifier == '_indihome') {
          ress.year_to_date =
            data.redeemer_existing_indihome[
              data.redeemer_existing_indihome.length - 1
            ].year_to_date;
        } else if (identifier == '_telco') {
          ress.year_to_date =
            data.redeemer_existing_telco[
              data.redeemer_existing_telco.length - 1
            ].year_to_date;
        }
      }

      console.log(
        `=>> REDEEMER EXISTING on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  async countDateLastYear(payload: any, identifier: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, identifier);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
    };
  }

  async countDateLastMonth(payload: any, identifier: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'month')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, identifier);

    return {
      name: 'Date Last Month',
      period: end_period,
      year_to_date: data.year_to_date,
    };
  }

  async countDateToday(payload: any, identifier: any) {
    if (payload.historyData) {
      const data = await this.reportMonitoringModel.findOne({
        period: moment(payload.period).format('YYYY-MM-DD'),
      });
      console.log('data report today : ', data.redeemer_existing);
      let year_to_date = 0;
      if (identifier == '') {
        year_to_date =
          data.redeemer_existing[data.redeemer_existing.length - 1]
            .year_to_date;
      } else if (identifier == '_indihome') {
        year_to_date =
          data.redeemer_existing_indihome[
            data.redeemer_existing_indihome.length - 1
          ].year_to_date;
      } else if (identifier == '_telco') {
        year_to_date =
          data.redeemer_existing_telco[data.redeemer_existing_telco.length - 1]
            .year_to_date;
      }
      const result = {
        name: 'Date Today',
        period: moment(payload.period).format('YYYY-MM-DD'),
        year_to_date: year_to_date,
      };
      return result;
    } else {
      const start_period_a = new Date(
        `${moment(payload.period).startOf('month')}`,
      ).toISOString();
      const end_period_a = moment(payload.period).endOf('days').toISOString();

      const start_period_b = new Date(
        `${moment(payload.period).startOf('years')}`,
      ).toISOString();
      const end_period_b = moment()
        .subtract(1, 'month')
        .endOf('month')
        .toISOString();

      const count_a = await this.counter({
        start_period: start_period_a,
        period: end_period_a,
        report_name: 'Date Today A',
      });

      const count_b = await this.counter({
        start_period: start_period_b,
        period: end_period_b,
        report_name: 'Date Today B',
      });

      const comparison = await this.counterComparison(
        count_a['data'],
        count_b['data'],
      );

      console.log('=== simulasi redeemer existing today ===');
      console.log(
        'DATE A',
        start_period_a,
        ' s.d ',
        end_period_a,
        ' - TOTAL ',
        count_a['data']?.length,
      );
      console.log(
        'DATE B',
        start_period_b,
        ' s.d ',
        end_period_b,
        ' - TOTAL ',
        count_b['data']?.length,
      );
      console.log('hasil comparison : ', comparison);
      console.log('=== simulasi redeemer existing ===');

      const result = {
        name: 'Date Today',
        period: moment(end_period_a).format('YYYY-MM-DD'),
        year_to_date: comparison ? comparison : 0,
      };

      return result;
    }
  }

  async counter(payload: any) {
    const start = Date.now();

    const startDate = moment(payload.start_period).toDate();
    const endDate = moment(payload.period).toDate();

    console.log(
      `=>> REDEEMER EXISTING on (${payload.report_name}) ${endDate} Start!`,
    );

    const query = [
      {
        $match: {
          transaction_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: '$msisdn',
        },
      },
      {
        $project: {
          _id: 0,
          msisdn: '$_id',
        },
      },
    ];

    console.log('Redeemer Existing Query: ', JSON.stringify(query));
    const count = await this.redeemModel.aggregate(query);

    const result = {
      name: payload.report_name,
      period: moment(payload.period).format('YYYY-MM-DD'),
      data: count.length > 0 ? count : null,
    };

    console.log(`=>> Datanya: `, result);
    console.log(
      `=>> REDEEMER EXISTING on (${
        payload.report_name
      }) ${endDate} Exec time: ${Date.now() - start}`,
    );

    return result;
  }

  async counterComparison(arr_a: any, arr_b: any) {
    /*
    let total = 0;

    if (arr_a && arr_b) {
      arr_a.forEach((itemA: any) => {
        let found = false;
        arr_b.forEach((itemB: any) => {
          if (itemB.msisdn === itemA.msisdn) {
            total += 1;
            // console.log(`${itemA.msisdn} = 1`);
            found = true;
          }
        });
        // if (!found) {
        //   console.log(`${itemA.msisdn} = 0`);
        // }
      });
    }

    return total;
    */
    let count = 0;
    if (arr_a?.length && arr_b?.length) {
      const msisdnSet = new Set(arr_a.map((item) => item.msisdn));

      for (let i = 0; i < arr_b.length; i++) {
        if (msisdnSet.has(arr_b[i].msisdn)) {
          // console.log(arr_b[i].msisdn);
          count++;
        }
      }
    }

    return count;
  }
}
