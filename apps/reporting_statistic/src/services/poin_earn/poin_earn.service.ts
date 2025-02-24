import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import { convertTime } from '../../helpers/time.format';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';
import { GeneralReportingCoreService } from '../reporting-core/general-reporting-core.service';

const moment = require('moment-timezone');

@Injectable()
export class PoinEarnService {
  private token: string;

  constructor(
    configService: ConfigService,
    private reportingCoreService: GeneralReportingCoreService,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
  ) {}

  async generateReport(
    period,
    payload,
    historyData,
  ): Promise<ReportingServiceResult> {
    const serviceResult = new ReportingServiceResult({
      is_error: false,
      message: '',
      stack: '',
    });

    try {
      if (historyData) {
        const data = await this.countLoadData(period);
        console.log('data  ', data);
        await this.reportMonitoringModel.findOneAndUpdate(
          {
            period: period,
          },
          {
            poin_earned: data,
          },
        );
      } else {
        const token = await this.reportingCoreService.getToken();
        if (!token) {
          //return console.error('-> [Poin Earn] Token Error !');
          serviceResult.message += 'PoinEarnService generate token error';
          serviceResult.stack +=
            'PoinEarnService error when get token from reportingCoreService.getToken()';
          serviceResult.is_error = true;
          return serviceResult;
        }

        this.token = `Bearer ${token.access_token}`;

        const result = await this.poinEarn(period, payload);

        if (result.is_error) {
          serviceResult.is_error = true;
          serviceResult.message += result.message;
          serviceResult.stack += result.stack;
          return serviceResult;
        }

        serviceResult.message = 'Poin earn generate report success';
        return serviceResult;
      }
    } catch (error) {
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;
      serviceResult.is_error = true;
      return serviceResult;
    }
  }

  private async countLoadData(period) {
    const dateLastYear = await this.countDateLastYear(period);
    const dateLastMonth = await this.countDateLastMonth(period);
    const dateToday = await this.countDateToday(period);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }
  private async countDateLastYear(period) {
    const end_period = moment(period).subtract(1, 'years').format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }
  private async countDateLastMonth(period) {
    const end_period = moment(period)
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

  private async countDateToday(period) {
    const end_period = moment(period).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: end_period,
    });

    console.log('data report today : ', data.poin_earned);

    let year_to_date = 0;
    let month_to_date = 0;

    year_to_date = data.poin_earned[2].year_to_date; // today
    month_to_date = data.poin_earned[2].month_to_date; // today

    return {
      name: 'Date Today',
      period: end_period,
      year_to_date: year_to_date,
      month_to_date: month_to_date,
    };
  }

  private async getReportOlderDate(period) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> Poin Earn on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data?.poin_earned);

      if (data) {
        ress.year_to_date = data.poin_earned[2].year_to_date; // today
        ress.month_to_date = data.poin_earned[2].month_to_date; // today
      }

      console.log(
        `=>> Poin Earn on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async poinEarn(period, payload) {
    console.log('-> [START] Generate Poin Earn Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const result = await this.reportingCoreService.getPointEarn({
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        //throw new Error(result.message);
        serviceResult.is_error = true;
        serviceResult.message = result.message;
        serviceResult.stack = 'Point earn get poin earn result error';
        return serviceResult;
      }

      // const lastYear = convertTime(
      //   moment(period).subtract(1, 'years').toISOString(),
      // );
      const lastYear = response?.last_year
        ? convertTime(response?.last_year?.year_to_date.end)
        : convertTime(
            moment(period).subtract(1, 'years').add(1, 'day').toISOString(),
          );
      const lastMonth = response?.last_month
        ? convertTime(response?.last_month?.year_to_date.end)
        : convertTime(
            moment(period).subtract(1, 'months').add(1, 'day').toISOString(),
          );
      const today = period;
      console.log(lastMonth, 'lastMonth poin earn');
      console.log(lastYear, 'lastYear poin earn');
      console.log(today, 'period poin earn');
      // const lastMonth = convertTime(
      //   moment(period).subtract(1, 'months').toISOString(),
      // );

      const parsed_data = [
        {
          name: 'Date Last Year',
          period: lastYear,
          year_to_date: response?.last_year?.year_to_date?.total || 0,
          month_to_date: response?.last_year?.month_to_date?.total || 0,
        },
        {
          name: 'Date Last Month',
          period: lastMonth,
          year_to_date: response?.last_month?.year_to_date?.total || 0,
          month_to_date: response?.last_month?.month_to_date?.total || 0,
        },
        {
          name: 'Date Today',
          period: today,
          year_to_date: response?.current?.year_to_date?.total || 0,
          month_to_date: response?.current?.month_to_date?.total || 0,
        },
      ];

      // update
      await this.reportMonitoringModel
        .findOneAndUpdate(
          { period: period },
          {
            poin_earned: parsed_data,
          },
        )
        .then((res) => {
          if (res) {
            console.log(
              'Reporting Monitoring Period ' +
                period +
                ' is updated at !' +
                res['updated_at'],
            );
          }
          return res;
        });
    } catch (e) {
      //console.error(
      //  '-> [ERROR] Generate Poin Earn Report. ',
      //  JSON.stringify(e),
      //);

      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      return serviceResult;
    }

    //console.log('-> [END] Generate Poin Earn Report ..');
  }
}
