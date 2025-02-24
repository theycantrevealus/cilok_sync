import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

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
export class ReportTransactionService {
  constructor(
    @InjectModel(ReportUniqueMSISDN.name, 'reporting')
    private reportModel: Model<ReportUniqueMSISDNDocument>,
    @InjectModel(MonthlyReportUniqueMSISDN.name, 'reporting')
    private monthlyReportModel: Model<MonthlyReportUniqueMSISDNDocument>,
    @InjectModel(YearlyReportUniqueMSISDN.name, 'reporting')
    private yearlyReportModel: Model<YearlyReportUniqueMSISDNDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
  ) {}

  /*
  / DATA STATISTIC INGESTION
  */
  async createUniqueMsisdnReport({
    period,
    msisdn,
  }: any): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    try {
      const newData = new this.reportModel({
        period: period.slice(0, 10),
        msisdn: msisdn,
        trx_burn: 1,
      });

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
        await this.trxBurnCounter({
          msisdn: msisdn,
          period: period.slice(0, 10),
          report_name: 'Date Today',
        });

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
      //  // throw new BadRequestException(e.message); //Error untuk mongoose
      // });
    } catch (e) {
      response.code = HttpStatusTransaction.CODE_INTERNAL_ERROR;
      response.message =
        'Error create unique msisdn report at reporting transaction';
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
    trx_burn,
  }: MonthlyReportUniqueMSISDN): Promise<GlobalTransactionResponse> {
    const newData = new this.monthlyReportModel({
      period: period.slice(0, 7),
      msisdn: msisdn,
      trx_burn: trx_burn,
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
      // await this.trxBurnCounter({
      //   msisdn: msisdn,
      //   period: period.slice(0, 7),
      //   report_name: 'Date Last Month',
      // });
      await this.monthlyReportModel
        .findOneAndUpdate(
          {
            msisdn: msisdn,
            period: period.slice(0, 7),
          },
          {
            $inc: { trx_burn: 1 },
            updated_at: new Date(),
          },
          { upsert: true, returnOriginal: false },
        )
        .then((res) => {
          console.log('------- Upsert Monthly Transaction Burning -------');
          console.log(res);
          console.log('------------------------------------------------');
        });

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
    trx_burn,
  }: MonthlyReportUniqueMSISDN): Promise<GlobalTransactionResponse> {
    const newData = new this.yearlyReportModel({
      period: period.slice(0, 4),
      msisdn: msisdn,
      trx_burn: 1,
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
      // await this.trxBurnCounter({
      //   msisdn: msisdn,
      //   period: period.slice(0, 4),
      //   report_name: 'Date Last Year',
      // });
      await this.yearlyReportModel
        .findOneAndUpdate(
          {
            msisdn: msisdn,
            period: period.slice(0, 4),
          },
          {
            $inc: { trx_burn: 1 },
            updated_at: new Date(),
          },
        )
        .then((res) => {
          console.log('------- Upsert Yearly Transaction Burning -------');
          console.log(res);
          console.log('------------------------------------------------');
        });

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

  //  Transaction Burning Counter
  async trxBurnCounter(payload: any) {
    if (payload.report_name === 'Date Today') {
      await this.reportModel
        .findOneAndUpdate(
          {
            msisdn: payload.msisdn,
            period: payload.period,
          },
          {
            $inc: { trx_burn: 1 },
            updated_at: new Date(),
          },
          { upsert: true, returnOriginal: false },
        )
        .then((res) => {
          console.log('------- Upsert Daily Transaction Burning -------');
          console.log(res);
          console.log('------------------------------------------------');
        });
    } else if (payload.report_name === 'Date Last Month') {
      await this.monthlyReportModel
        .findOneAndUpdate(
          {
            msisdn: payload.msisdn,
            period: payload.period,
          },
          {
            $inc: { trx_burn: 1 },
            updated_at: new Date(),
          },
          { upsert: true, returnOriginal: false },
        )
        .then((res) => {
          console.log('------- Upsert Monthly Transaction Burning -------');
          console.log(res);
          console.log('------------------------------------------------');
        });
    } else if (payload.report_name === 'Date Last Year') {
      await this.yearlyReportModel
        .findOneAndUpdate(
          {
            msisdn: payload.msisdn,
            period: payload.period,
          },
          {
            $inc: { trx_burn: 1 },
            updated_at: new Date(),
          },
        )
        .then((res) => {
          console.log('------- Upsert Yearly Transaction Burning -------');
          console.log(res);
          console.log('------------------------------------------------');
        });
    }
  }

  /*
  / DATA REPORT INGESTION
  */
  async reportingMonitoringUpdate(payload: any) {
    const result = await this.countRedeemReporting(payload);

    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          trx_burn: result.trx_burn,
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
    const trxDateLastYear = await this.trxCountDateLastYear(payload);
    const trxDateLastMonth = await this.trxCountDateLastMonth(payload);
    const trxDateToday = await this.trxCountDateToday(payload);

    const result = {
      trx_burn: [trxDateLastYear, trxDateLastMonth, trxDateToday],
    };
    return await result;
  }

  async trxCountDateLastYear(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .toISOString();

    return await this.trxCounter({
      period: end_period,
      report_name: 'Date Last Year',
    });
  }

  async trxCountDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.trxCounter({
      period: end_period,
      report_name: 'Date Last Month',
    });
  }

  async trxCountDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.trxCounter({
      period: end_period,
      report_name: 'Date Today',
    });
  }

  async trxCounter(payload: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const year_to_date = moment(end_period)
      .startOf('year')
      .format('YYYY-MM-DD');
    const month_to_date = moment(end_period)
      .startOf('month')
      .format('YYYY-MM-DD');
    // const startPeriod = await moment(
    //   endPeriod.slice(0, 4) + '-01-02',
    // ).toISOString();

    const count_ytd = await this.reportModel
      .aggregate([
        {
          $match: {
            period: {
              $gte: year_to_date,
              $lte: end_period,
            },
          },
        },
        {
          $group: {
            _id: null,
            trx_burn: { $sum: '$trx_burn' },
          },
        },
      ])
      .exec();

    const count_mtd = await this.reportModel
      .aggregate([
        {
          $match: {
            period: {
              $gte: month_to_date,
              $lte: end_period,
            },
          },
        },
        {
          $group: {
            _id: null,
            trx_burn: { $sum: '$trx_burn' },
          },
        },
      ])
      .exec();

    let result;
    if (
      count_ytd.length > 0 &&
      count_mtd.length > 0 &&
      count_mtd[0]['trx_burn'] &&
      count_mtd[0]['trx_burn']
    ) {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        year_to_date: count_ytd[0]['trx_burn'],
        month_to_date: count_mtd[0]['trx_burn'],
      };
    } else {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        year_to_date: 0,
        month_to_date: 0,
      };
    }

    return result;
  }
}
