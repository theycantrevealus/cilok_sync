import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
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
import {
  MonthlyReportUniqueMSISDN,
  MonthlyReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.monthly.model';
import {
  YearlyReportUniqueMSISDN,
  YearlyReportUniqueMSISDNDocument,
} from '../../model/unique_msisdn/unique.msisdn.yearly.model';

@Injectable()
export class ReportingUniqueMsisdnService {
  constructor(
    @InjectModel(ReportUniqueMSISDN.name, 'reporting')
    private reportModel: Model<ReportUniqueMSISDNDocument>,
    @InjectModel(MonthlyReportUniqueMSISDN.name, 'reporting')
    private monthlyReportModel: Model<MonthlyReportUniqueMSISDNDocument>,
    @InjectModel(YearlyReportUniqueMSISDN.name, 'reporting')
    private yearlyReportModel: Model<YearlyReportUniqueMSISDNDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async createUniqueMsisdnReport({
    period,
    msisdn,
  }: any): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    try {
      const newData = new this.reportModel({
        period: period.slice(0, 10),
        msisdn: msisdn,
      });
      // console.log('service-unique-msisdn');
      const dataExistence = await this.reportModel
        .findOne({
          period: period.slice(0, 10),
          msisdn: msisdn,
        })
        .then((res) => {
          // console.log(res);
          return res;
        });

      if (dataExistence) {
        console.log(
          'Data Exist : (' +
            dataExistence.msisdn +
            ' - ' +
            dataExistence.period +
            ')',
        );
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Data Exist';
        response.transaction_classify = 'DATA_EXIST_UNIQUE_MSISDN_REPORT';
        response.payload = {
          trace_id: true,
          data: dataExistence,
        };
        return response;
      }

      return await newData.save().then(async (data) => {
        const postMonthly = await this.createUniqueMsisdnMonthlyReport(newData);
        if (postMonthly) {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'CREATE_UNIQUE_MSISDN_REPORT';
          response.payload = {
            trace_id: true,
            period: data.period,
            msisdn: data.msisdn,
          };
          return response;
        } else {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Failed Posting Monthly Report';
          response.transaction_classify = 'FAILED_CREATE_UNIQUE_MSISDN_REPORT';
          response.payload = {
            trace_id: true,
          };
          return response;
        }
      });
      //.catch((e) => {
      //  throw new BadRequestException(e.message); //Error untuk mongoose
      //});
    } catch (e) {
      response.code = HttpStatusTransaction.CODE_INTERNAL_ERROR;
      response.message = 'Fail';
      response.payload = {
        message: e.message,
        stack: e.stack,
      };
      return response;
    }
  }

  async createUniqueMsisdnMonthlyReport({
    period,
    msisdn,
  }: MonthlyReportUniqueMSISDN): Promise<GlobalTransactionResponse> {
    const newData = new this.monthlyReportModel({
      period: period.slice(0, 7),
      msisdn: msisdn,
    });
    const response = new GlobalTransactionResponse();

    const dataExistence = await this.monthlyReportModel
      .findOne({
        period: period.slice(0, 7),
        msisdn: msisdn,
      })
      .then((res) => {
        // console.log(res);
        return res;
      });

    if (dataExistence) {
      console.log(
        'Data Exist : (' +
          dataExistence.msisdn +
          ' - ' +
          dataExistence.period +
          ')',
      );
      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Data Exist';
      response.transaction_classify = 'DATA_EXIST_UNIQUE_MSISDN_REPORT';
      response.payload = {
        trace_id: true,
        data: dataExistence,
      };
      return response;
    }

    return await newData
      .save()
      .catch((e: BadRequestException) => {
        throw new BadRequestException(e.message); //Error untuk mongoose
      })
      .then(async (data) => {
        const postYearly = await this.createUniqueMsisdnYearlyReport(newData);
        if (postYearly) {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'CREATE_UNIQUE_MSISDN_REPORT';
          response.payload = {
            trace_id: true,
            period: data.period,
            msisdn: data.msisdn,
          };
          return response;
        } else {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Failed Posting Yearly Report';
          response.transaction_classify = 'FAILED_CREATE_UNIQUE_MSISDN_REPORT';
          response.payload = {
            trace_id: true,
          };
          return response;
        }
      });
  }

  async createUniqueMsisdnYearlyReport({
    period,
    msisdn,
  }: MonthlyReportUniqueMSISDN): Promise<GlobalTransactionResponse> {
    const newData = new this.yearlyReportModel({
      period: period.slice(0, 4),
      msisdn: msisdn,
    });
    const response = new GlobalTransactionResponse();
    const dataExistence = await this.yearlyReportModel
      .findOne({
        period: period.slice(0, 4),
        msisdn: msisdn,
      })
      .then((res) => {
        // console.log(res);
        return res;
      });

    if (dataExistence) {
      console.log(
        'Data Exist : (' +
          dataExistence.msisdn +
          ' - ' +
          dataExistence.period +
          ')',
      );
      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Data Exist';
      response.transaction_classify = 'DATA_EXIST_UNIQUE_MSISDN_REPORT';
      response.payload = {
        trace_id: true,
        data: dataExistence,
      };
      return response;
    }

    return await newData
      .save()
      .catch((e: BadRequestException) => {
        throw new BadRequestException(e.message); //Error untuk mongoose
      })
      .then((data) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = 'CREATE_UNIQUE_MSISDN_REPORT';
        response.payload = {
          trace_id: true,
          period: data.period,
          msisdn: data.msisdn,
        };
        return response;
      });
  }

  async reportingMonitoringUpdate(payload: any) {
    const redeemer = await this.countRedeemReporting(payload, '');
    const redeemer_indihome = await this.countRedeemReporting(
      payload,
      '_indihome',
    );
    const redeemer_telco = await this.countRedeemReporting(payload, '_telco');
    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          redeemer: redeemer,
          redeemer_telco: redeemer_telco,
          redeemer_indihome: redeemer_indihome,
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

  private async getReportOlderDate(period, identifier: any) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> REDEEMER on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data);

      if (data) {
        if (identifier == '') {
          ress.year_to_date =
            data.redeemer[data.redeemer.length - 1].year_to_date;
          ress.month_to_date =
            data.redeemer[data.redeemer.length - 1].month_to_date;
        }
        if (identifier == '_indihome') {
          ress.year_to_date =
            data.redeemer_indihome[
              data.redeemer_indihome.length - 1
            ].year_to_date;
          ress.month_to_date =
            data.redeemer_indihome[
              data.redeemer_indihome.length - 1
            ].month_to_date;
        }
        if (identifier == '_telco') {
          ress.year_to_date =
            data.redeemer_telco[data.redeemer_telco.length - 1].year_to_date;
          ress.month_to_date =
            data.redeemer_telco[data.redeemer_telco.length - 1].month_to_date;
        }
      }

      console.log(`=>> REDEEMER on ${period} Exec time: ${Date.now() - start}`);
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

  async countRedeemReporting(payload: any, identifier: any) {
    // const dateLastYear = await this.countDateLastYear(payload);
    // const dateLastMonth = await this.countDateLastMonth(payload);

    const dateLastYear = await this.countDateLastYear(payload, identifier);
    const dateLastMonth = await this.countDateLastMonth(payload, identifier);
    const dateToday = await this.countDateToday(payload, identifier);

    return await [dateLastYear, dateLastMonth, dateToday];
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
      month_to_date: data.month_to_date,
    };
  }

  async countDateLastMonth(payload: any, identifier: any) {
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

  async countDateToday(payload: any, identifier: any) {
    const end_period = moment(payload.period).toISOString();
    if (payload.historyData) {
      const data = await this.reportMonitoringModel.findOne({
        period: moment(end_period).format('YYYY-MM-DD'),
      });
      console.log('data report today : ', data.redeemer);
      let year_to_date = 0;
      let month_to_date = 0;
      if (identifier == '') {
        year_to_date = data.redeemer[data.redeemer.length - 1].year_to_date;
        month_to_date = data.redeemer[data.redeemer.length - 1].month_to_date;
      }
      if (identifier == '_indihome') {
        year_to_date =
          data.redeemer_indihome[data.redeemer_indihome.length - 1]
            .year_to_date;
        month_to_date =
          data.redeemer_indihome[data.redeemer_indihome.length - 1]
            .month_to_date;
      }
      if (identifier == '_telco') {
        year_to_date =
          data.redeemer_telco[data.redeemer_telco.length - 1].year_to_date;
        month_to_date =
          data.redeemer_telco[data.redeemer_telco.length - 1].month_to_date;
      }
      const result = {
        name: 'Date Today',
        period: moment(end_period).format('YYYY-MM-DD'),
        year_to_date: year_to_date,
        month_to_date: month_to_date,
      };
      return result;
    } else {
      return await this.counter(
        {
          period: end_period,
          report_name: 'Date Today',
        },
        identifier,
      );
    }
  }

  async counter(payload: any, identifier: any) {
    const start = Date.now();

    const start_period = moment(payload.period).startOf('days').toDate();
    const end_period = moment(payload.period).endOf('days').toDate();

    const yesterday = moment(payload.period)
      .subtract(1, 'days')
      .format('YYYY-MM-DD');

    const count_yesterday = await this.getReportOlderDate(
      yesterday,
      identifier,
    );

    console.log(
      `=>> REDEEMER on (${payload.report_name}) ${end_period} Start!`,
    );

    const query_today = [
      {
        $match: {
          transaction_date: {
            $gte: start_period,
            $lte: end_period,
          },
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

    console.log('=>> Query Redeemer: ', JSON.stringify(query_today));
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
      `=>> REDEEMER on (${payload.report_name}) ${end_period} Exec time: ${
        Date.now() - start
      }`,
    );

    return result;
  }
}
