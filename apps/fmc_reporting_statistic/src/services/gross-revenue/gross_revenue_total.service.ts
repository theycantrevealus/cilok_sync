import { ReportingServiceResult } from '@fmc_reporting_generation/model/reporting_service_result';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { convertTime } from '../../helpers/time.format';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';
import { GeneralReportingCoreService } from '../reporting-core/general-reporting-core.service';

const moment = require('moment-timezone');

@Injectable()
export class GrossRevenueTotalService {
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
        const data = await this.countLoadData(period, '');
        const data_indihome = await this.countLoadData(period, '_indihome');
        const data_telco = await this.countLoadData(period, '_telco');
        console.log('data  ', data);
        await this.reportMonitoringModel.findOneAndUpdate(
          {
            period: period,
          },
          {
            gross_revenue: data,
            gross_revenue_telco: data_telco,
            gross_revenue_indihome: data_indihome,
          },
        );
      } else {
        const token = await this.reportingCoreService.getToken();
        if (!token) {
          //return console.error('-> [Gross Revenue Total] Token Error !');
          serviceResult.message +=
            'GrossRevenueTotalService generate token error';
          serviceResult.stack +=
            'GrossRevenueTotalService error when get token from reportingCoreSservice.getToken()';
          serviceResult.is_error = true;
          return serviceResult;
        }

        this.token = `Bearer ${token.access_token}`;

        const result = await this.grossRevenueTotal(period, payload);

        if (result.is_error) {
          serviceResult.is_error = true;
          serviceResult.message += result.message;
          serviceResult.stack += result.stack;
          return serviceResult;
        }

        serviceResult.message = 'Success Generate Report Gross Revenue Total';
        return serviceResult;
      }
    } catch (error) {
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;
      serviceResult.is_error = true;
      return serviceResult;
    }
  }

  private async countLoadData(period, identifier: any) {
    const dateLastYear = await this.countDateLastYear(period, identifier);
    const dateLastMonth = await this.countDateLastMonth(period, identifier);
    const dateToday = await this.countDateToday(period, identifier);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }
  private async countDateLastYear(period, identifier) {
    const end_period = moment(period).subtract(1, 'years').format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, identifier);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }
  private async countDateLastMonth(period, identifier: any) {
    const end_period = moment(period)
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

  private async countDateToday(period, identifier: any) {
    const end_period = moment(period).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: end_period,
    });

    let year_to_date = 0;
    let month_to_date = 0;
    console.log('data report today : ', data.gross_revenue);
    if (identifier == '') {
      year_to_date =
        data.gross_revenue[data.gross_revenue.length - 1].year_to_date;
      month_to_date =
        data.gross_revenue[data.gross_revenue.length - 1].month_to_date;
    } else if (identifier == '_indihome') {
      year_to_date =
        data.gross_revenue_indihome[data.gross_revenue_indihome.length - 1]
          .year_to_date;
      month_to_date =
        data.gross_revenue_indihome[data.gross_revenue_indihome.length - 1]
          .month_to_date;
    } else if (identifier == '_telco') {
      year_to_date =
        data.gross_revenue_telco[data.gross_revenue_telco.length - 1]
          .year_to_date;
      month_to_date =
        data.gross_revenue_telco[data.gross_revenue_telco.length - 1]
          .month_to_date;
    }

    return {
      name: 'Date Today',
      period: end_period,
      year_to_date: year_to_date,
      month_to_date: month_to_date,
    };
  }

  private async getReportOlderDate(period, identifier: any) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> Gross Revenue Total on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      if (identifier == '') {
        ress.year_to_date =
          data.gross_revenue[data.gross_revenue.length - 1].year_to_date;
        ress.month_to_date =
          data.gross_revenue[data.gross_revenue.length - 1].month_to_date;
      } else if (identifier == '_indihome') {
        ress.year_to_date =
          data.gross_revenue_indihome[
            data.gross_revenue_indihome.length - 1
          ].year_to_date;
        ress.month_to_date =
          data.gross_revenue_indihome[
            data.gross_revenue_indihome.length - 1
          ].month_to_date;
      } else if (identifier == '_telco') {
        ress.year_to_date =
          data.gross_revenue_telco[
            data.gross_revenue_telco.length - 1
          ].year_to_date;
        ress.month_to_date =
          data.gross_revenue_telco[
            data.gross_revenue_telco.length - 1
          ].month_to_date;
      }

      console.log(
        `=>> Gross Revenue Total on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async grossRevenueTotal(
    period,
    payload,
  ): Promise<ReportingServiceResult> {
    console.log('-> [START] Generate Gross Revenue Total Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const result = await this.reportingCoreService.getGrossRevenue({
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        //throw new Error(result.message);
        serviceResult.message += 'Gross revenue total result payload error';
        serviceResult.stack +=
          'Gross revenue total error when getGrossRevenue from reportingCoreService';
        serviceResult.is_error = true;
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
      console.log(lastMonth, 'lastMonth gross revenue');
      console.log(lastYear, 'lastYear gross revenue');
      console.log(today, 'period gross revenue');
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
            gross_revenue: parsed_data,
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

      console.log('-> [END] Generate Gross Revenue Total Report ..');

      serviceResult.message = 'Gross revenue total success';
      return serviceResult;
    } catch (e) {
      console.error(
        '-> [ERROR] Generate Gross Revenue Total Report. ',
        JSON.stringify(e),
      );
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      serviceResult.is_error = true;
      return serviceResult;
    }
  }
}
