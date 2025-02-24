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
export class PoinEarnRedeemerService {
  private token: string;

  constructor(
    configService: ConfigService,
    private reportingCoreService: GeneralReportingCoreService,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
  ) {}

  async generateReport(period, payload, historyData) {
    const serviceResult = new ReportingServiceResult({
      is_error: false,
      message: '',
      stack: '',
    });

    try {
      if (historyData) {
        const data = await this.countLoadData(period, false);
        console.log('data non channel ', data);
        await this.reportMonitoringModel.findOneAndUpdate(
          {
            period: period,
          },
          {
            poin_earned_redeemer: data,
          },
        );
        if (payload.parameter.channel) {
          const data = await this.countLoadData(period, true);
          await this.reportMonitoringModel.findOneAndUpdate(
            {
              period: period,
            },
            {
              poin_earned_redeemer_mytelkomsel: data,
            },
          );
        }
      } else {
        const token = await this.reportingCoreService.getToken();
        if (!token) {
          //return console.error('-> [Poin Earn] Token Error !');
          serviceResult.message +=
            'PoinEarnRedeemerService generate token error';
          serviceResult.stack +=
            'PoinEarnRedeemerService generate token error at reportingCoreService.getToken()';
          serviceResult.is_error = true;
          return serviceResult;
        }

        this.token = `Bearer ${token.access_token}`;

        let result = await this.poinEarnRedeemer(period, payload);
        serviceResult.message += `\n${result.message}`;
        if (result.is_error) {
          serviceResult.is_error = true;
          serviceResult.stack = `n${result.stack}`;
        }

        if (payload.parameter.channel) {
          result = await this.poinEarnRedeemerMyTelkomsel(period, payload);
          serviceResult.message += `\n${result.message}`;
          if (result.is_error) {
            serviceResult.is_error = true;
            serviceResult.stack += `n${result.stack}`;
          }
        }

        serviceResult.message = 'Success poin earn redeemer generate report';
        return serviceResult;
      }
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;
      return serviceResult;
    }
  }

  private async countLoadData(period, typeChannel) {
    const dateLastYear = await this.countDateLastYear(period, typeChannel);
    const dateLastMonth = await this.countDateLastMonth(period, typeChannel);
    const dateToday = await this.countDateToday(period, typeChannel);

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }
  private async countDateLastYear(period, typeChannel) {
    const end_period = moment(period).subtract(1, 'years').format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, typeChannel);

    return {
      name: 'Date Last Year',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }
  private async countDateLastMonth(period, typeChannel) {
    const end_period = moment(period)
      .subtract(1, 'months')
      .format('YYYY-MM-DD');

    const data = await this.getReportOlderDate(end_period, typeChannel);

    return {
      name: 'Date Last Month',
      period: end_period,
      year_to_date: data.year_to_date,
      month_to_date: data.month_to_date,
    };
  }

  private async countDateToday(period, typeChannel) {
    const end_period = moment(period).format('YYYY-MM-DD');
    const data = await this.reportMonitoringModel.findOne({
      period: end_period,
    });

    console.log(
      'data report today : ',
      typeChannel
        ? data.poin_earned_redeemer
        : data.poin_earned_redeemer_mytelkomsel,
    );

    let year_to_date = 0;
    let month_to_date = 0;

    if (typeChannel) {
      year_to_date = data.poin_earned_redeemer_mytelkomsel[2].year_to_date; // today
      month_to_date = data.poin_earned_redeemer_mytelkomsel[2].month_to_date; // today
    } else {
      year_to_date = data.poin_earned_redeemer[2].year_to_date; // today
      month_to_date = data.poin_earned_redeemer[2].month_to_date; // today
    }

    return {
      name: 'Date Today',
      period: end_period,
      year_to_date: year_to_date,
      month_to_date: month_to_date,
    };
  }

  private async getReportOlderDate(period, typeChannel) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(
        `=>> Poin Earn ${
          typeChannel ? 'MyTelkomsel' : ''
        } on ${period} query ...`,
      );

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log(
        'DATANYA',
        typeChannel
          ? data.poin_earned_redeemer_mytelkomsel
          : data?.poin_earned_redeemer,
      );

      if (data) {
        if (typeChannel) {
          ress.year_to_date =
            data.poin_earned_redeemer_mytelkomsel[2].year_to_date; // today
          ress.month_to_date =
            data.poin_earned_redeemer_mytelkomsel[2].month_to_date; // today
        } else {
          ress.year_to_date = data.poin_earned_redeemer[2].year_to_date; // today
          ress.month_to_date = data.poin_earned_redeemer[2].month_to_date; // today
        }
      }

      console.log(
        `=>> Poin Earn ${
          typeChannel ? 'MyTelkomsel' : ''
        } on ${period} Exec time: ${Date.now() - start}`,
      );
    } catch (err) {
      // TODO
    }

    return ress;
  }

  private async poinEarnRedeemer(
    period,
    payload,
  ): Promise<ReportingServiceResult> {
    console.log('-> [START] Generate Poin Earn Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const result = await this.reportingCoreService.getTotalRedeemer2({
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        //throw new Error(result.message);
        serviceResult.is_error = true;
        serviceResult.message = result.message;
        serviceResult.stack =
          'Poin earn redeemer getTotalRedeemer error payload result';
        return serviceResult;
      }

      // const lastYear = convertTime(
      //   moment(period).subtract(1, 'years').toISOString(),
      // );
      // const lastMonth = convertTime(
      //   moment(period).subtract(1, 'months').toISOString(),
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
      console.log(lastMonth, 'lastMonth gross earn redeemer');
      console.log(lastYear, 'lastYear gross earn redeemer');
      console.log(today, 'period gross earn redeemer');

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
            poin_earned_redeemer: parsed_data,
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

      console.log('-> [END] Generate Poin Earn Report ..');
      serviceResult.message = 'Poin earn redeemer success';
      return serviceResult;
    } catch (e) {
      console.error(
        '-> [ERROR] Generate Poin Earn Report. ',
        JSON.stringify(e),
      );

      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      return serviceResult;
    }
  }

  private async poinEarnRedeemerMyTelkomsel(
    period,
    payload,
  ): Promise<ReportingServiceResult> {
    console.log('-> [START] Generate Poin Earn MyTelkomsel Report ..');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const result = await this.reportingCoreService.getTotalRedeemer2({
        // TODO : Need Configurable payload.parameter.channel
        channel: payload.parameter.channel,
        date: period,
        token: this.token,
      });

      const response: any = result?.payload;
      if (!response) {
        // throw new Error(result.message);
        serviceResult.is_error = true;
        serviceResult.message = result.message;
        serviceResult.stack =
          'Poin earn redeemer my telkomsel error payload result';
        return serviceResult;
      }

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
            poin_earned_redeemer_mytelkomsel: parsed_data,
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

      console.log('-> [END] Generate Poin Earn MyTelkomsel Report ..');

      serviceResult.message = 'Poin earn redeemer my telkomsel success';
      return serviceResult;
    } catch (e) {
      console.error(
        '-> [ERROR] Generate Poin Earn MyTelkomsel Report. ',
        JSON.stringify(e),
      );

      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      return serviceResult;
    }
  }
}
