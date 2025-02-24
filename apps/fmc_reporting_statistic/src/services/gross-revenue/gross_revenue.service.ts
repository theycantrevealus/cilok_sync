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
export class GrossRevenueService {
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
        const data = await this.countLoadData(period, false, '');
        const data_indihome = await this.countLoadData(
          period,
          false,
          '_indihome',
        );
        const data_telco = await this.countLoadData(period, false, '_telco');
        console.log('data non channel ', data);
        await this.reportMonitoringModel.findOneAndUpdate(
          {
            period: period,
          },
          {
            gross_revenue_redeemer: data,
            gross_revenue_redeemer_telco: data_telco,
            gross_revenue_redeemer_indihome: data_indihome,
          },
        );
        if (payload.parameter.channel) {
          const data = await this.countLoadData(period, true, '');
          const data_indihome = await this.countLoadData(
            period,
            true,
            '_indihome',
          );
          const data_telco = await this.countLoadData(period, true, '_telco');
          await this.reportMonitoringModel.findOneAndUpdate(
            {
              period: period,
            },
            {
              gross_revenue_redeemer_mytelkomsel: data,
              gross_revenue_redeemer_mytelkomsel_telco: data_telco,
              gross_revenue_redeemer_mytelkomsel_indihome: data_indihome,
            },
          );
        }
      } else {
        const token = await this.reportingCoreService.getToken();
        if (!token) {
          // return console.error('-> [Gross Revenue] Token Error !');
          serviceResult.message += 'GrossRevenueService generate token error';
          serviceResult.stack +=
            'GrossRevenueService generate token error from reportingCoreService.getToken()';
          serviceResult.is_error = true;
          return serviceResult;
        }

        this.token = `Bearer ${token.access_token}`;

        let err = await this.grossRevenue(period, payload);

        serviceResult.message += `\n${err.message}`;
        if (err.is_error) {
          serviceResult.is_error = true;
          serviceResult.stack += `\n${err.stack}`;
        }

        if (payload.parameter.channel) {
          err = await this.grossRevenueMyTelkomsel(period, payload);

          serviceResult.message += `\n${err.message}`;
          if (err.is_error) {
            serviceResult.is_error = true;
            serviceResult.stack += `\n${err.stack}`;
          }
        }

        serviceResult.message = 'Gross revenue generate report success';
        return serviceResult;
      }
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  private async countLoadData(period, typeChannel, identifier: any) {
    const dateLastYear = await this.countDateLastYear(
      period,
      typeChannel,
      identifier,
    );
    const dateLastMonth = await this.countDateLastMonth(
      period,
      typeChannel,
      identifier,
    );
    const dateToday = await this.countDateToday(
      period,
      typeChannel,
      identifier,
    );

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }
  private async countDateLastYear(period, typeChannel, identifier: any) {
    const end_period = moment(period).subtract(1, 'years').format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(
      end_period,
      typeChannel,
      identifier,
    );

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }
  private async countDateLastMonth(period, typeChannel, identifier: any) {
    const end_period = moment(period)
      .subtract(1, 'months')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(
      end_period,
      typeChannel,
      identifier,
    );

    return {
      name: 'Date Last Month',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  private async countDateToday(period, typeChannel, identifier: any) {
    const end_period = moment(period).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: end_period,
    });

    console.log(
      'data report today : ',
      typeChannel
        ? data.gross_revenue_redeemer
        : data.gross_revenue_redeemer_mytelkomsel,
    );

    let year_to_date = 0;
    let month_to_date = 0;

    if (typeChannel) {
      if (identifier == '') {
        year_to_date =
          data.gross_revenue_redeemer_mytelkomsel[
            data.gross_revenue_redeemer_mytelkomsel.length - 1
          ].year_to_date;
        month_to_date =
          data.gross_revenue_redeemer_mytelkomsel[
            data.gross_revenue_redeemer_mytelkomsel.length - 1
          ].month_to_date;
      } else if (identifier == '_indihome') {
        year_to_date =
          data.gross_revenue_redeemer_mytelkomsel_indihome[
            data.gross_revenue_redeemer_mytelkomsel_indihome.length - 1
          ].year_to_date;
        month_to_date =
          data.gross_revenue_redeemer_mytelkomsel_indihome[
            data.gross_revenue_redeemer_mytelkomsel_indihome.length - 1
          ].month_to_date;
      } else if (identifier == '_telco') {
        year_to_date =
          data.gross_revenue_redeemer_mytelkomsel_telco[
            data.gross_revenue_redeemer_mytelkomsel_telco.length - 1
          ].year_to_date;
        month_to_date =
          data.gross_revenue_redeemer_mytelkomsel_telco[
            data.gross_revenue_redeemer_mytelkomsel_telco.length - 1
          ].month_to_date;
      }
    } else {
      if (identifier == '') {
        year_to_date =
          data.gross_revenue_redeemer[data.gross_revenue_redeemer.length - 1]
            .year_to_date;
        month_to_date =
          data.gross_revenue_redeemer[data.gross_revenue_redeemer.length - 1]
            .month_to_date;
      } else if (identifier == '_indihome') {
        year_to_date =
          data.gross_revenue_redeemer_indihome[
            data.gross_revenue_redeemer_indihome.length - 1
          ].year_to_date;
        month_to_date =
          data.gross_revenue_redeemer_indihome[
            data.gross_revenue_redeemer_indihome.length - 1
          ].month_to_date;
      } else if (identifier == '_telco') {
        year_to_date =
          data.gross_revenue_redeemer_telco[
            data.gross_revenue_redeemer_telco.length - 1
          ].year_to_date;
        month_to_date =
          data.gross_revenue_redeemer_telco[
            data.gross_revenue_redeemer_telco.length - 1
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

  private async getReportOlderDate(period, typeChannel, identifier: any) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(
        `=>> Gross Revenue ${
          typeChannel ? 'MyTelkomsel' : ''
        } on ${period} query ...`,
      );

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log(
        'DATANYA',
        typeChannel
          ? data.gross_revenue_redeemer_mytelkomsel
          : data?.gross_revenue_redeemer,
      );

      if (data) {
        if (typeChannel) {
          if (identifier == '') {
            ress.year_to_date =
              data.gross_revenue_redeemer_mytelkomsel[
                data.gross_revenue_redeemer_mytelkomsel.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer_mytelkomsel[
                data.gross_revenue_redeemer_mytelkomsel.length - 1
              ].month_to_date;
          } else if (identifier == '_indihome') {
            ress.year_to_date =
              data.gross_revenue_redeemer_mytelkomsel_indihome[
                data.gross_revenue_redeemer_mytelkomsel_indihome.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer_mytelkomsel_indihome[
                data.gross_revenue_redeemer_mytelkomsel_indihome.length - 1
              ].month_to_date;
          } else if (identifier == '_telco') {
            ress.year_to_date =
              data.gross_revenue_redeemer_mytelkomsel_telco[
                data.gross_revenue_redeemer_mytelkomsel_telco.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer_mytelkomsel_telco[
                data.gross_revenue_redeemer_mytelkomsel_telco.length - 1
              ].month_to_date;
          }
        } else {
          if (identifier == '') {
            ress.year_to_date =
              data.gross_revenue_redeemer[
                data.gross_revenue_redeemer.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer[
                data.gross_revenue_redeemer.length - 1
              ].month_to_date;
          } else if (identifier == '_indihome') {
            ress.year_to_date =
              data.gross_revenue_redeemer_indihome[
                data.gross_revenue_redeemer_indihome.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer_indihome[
                data.gross_revenue_redeemer_indihome.length - 1
              ].month_to_date;
          } else if (identifier == '_telco') {
            ress.year_to_date =
              data.gross_revenue_redeemer_telco[
                data.gross_revenue_redeemer_telco.length - 1
              ].year_to_date;
            ress.month_to_date =
              data.gross_revenue_redeemer_telco[
                data.gross_revenue_redeemer_telco.length - 1
              ].month_to_date;
          }
        }
      }

      console.log(
        `=>> Gross Revenue ${
          typeChannel ? 'MyTelkomsel' : ''
        } on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async grossRevenue(period, payload) {
    console.log('-> [START] Generate Gross Revenue Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      // dapatkan datanya
      const result = await this.reportingCoreService.getTotalRedeemerRevenue({
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        //throw new Error(result.message);
        serviceResult.is_error = true;
        serviceResult.message = result.message;
        serviceResult.stack = 'Gross revenue get total redemeer revenue error';
        return serviceResult;
      }

      // olah data
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
      console.log(lastMonth, 'lastMonth Gross');
      console.log(lastYear, 'lastYear Gross');
      console.log(today, 'period Gross');
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
          {
            period: period,
          },
          {
            gross_revenue_redeemer: parsed_data,
            gross_revenue_redeemer_telco: parsed_data,
            gross_revenue_redeemer_indihome: parsed_data,
          },
        )
        .then((res) => {
          if (res) {
            console.log(
              'Reporting Monitoring Period ' +
                payload.period +
                ' is updated at !' +
                res['updated_at'],
            );
          }
          return res;
        });

      serviceResult.message = 'Generate gross revenue report';
      return serviceResult;
    } catch (e) {
      console.error(
        '-> [ERROR] Generate Gross Revenue Report. ',
        JSON.stringify(e),
      );

      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;

      return serviceResult;
    }

    // console.log('-> [END] Generate Gross Revenue Report ..');
  }

  private async grossRevenueMyTelkomsel(period, payload) {
    console.log('-> [START] Generate Gross Revenue MyTelkomsel Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      // dapatkan datanya
      const result = await this.reportingCoreService.getTotalRedeemerRevenue({
        channel: payload.parameter.channel,
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        throw new Error(result.message);
      }

      // olah data
      const lastYear = convertTime(
        moment(period).subtract(1, 'years').toISOString(),
      );
      const lastMonth = convertTime(
        moment(period).subtract(1, 'months').toISOString(),
      );
      const today = convertTime(moment(period).toISOString());

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
          {
            period: period,
          },
          {
            gross_revenue_redeemer_mytelkomsel: parsed_data,
            gross_revenue_redeemer_mytelkomsel_telco: parsed_data,
            gross_revenue_redeemer_mytelkomsel_indihome: parsed_data,
          },
        )
        .then((res) => {
          if (res) {
            console.log(
              'Reporting Monitoring Period ' +
                payload.period +
                ' is updated at !' +
                res['updated_at'],
            );
          }
          return res;
        });

      serviceResult.message = 'Generate gross revenue myTelkomsel report';
      return serviceResult;
    } catch (e) {
      console.error(
        '-> [ERROR] Generate Gross Revenue MyTelkomsel Report. ',
        JSON.stringify(e),
      );

      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;

      return serviceResult;
    }

    // console.log('-> [END] Generate Gross Revenue MyTelkomsel Report ..');
  }
}
