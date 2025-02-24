import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import {
  KeywordApprovalLog,
  KeywordApprovalLogDocument,
} from '@/keyword/models/keyword.approval.log';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';

import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../../model/reporting.model';
import {
  ReportUniqueRewardLiveSystem,
  ReportUniqueRewardLiveSystemDocument,
} from '../../../model/reward/unique.reward.live.system.model';
import {
  ReportUniqueRewardTransaction,
  ReportUniqueRewardTransactionDocument,
} from '../../../model/reward/unique.reward.transaction.model';

@Injectable()
export class ReportingRewardService {
  constructor(
    @InjectModel(ReportUniqueRewardLiveSystem.name)
    private reportRewardLiveSystemModel: Model<ReportUniqueRewardLiveSystemDocument>,

    @InjectModel(ReportUniqueRewardTransaction.name)
    private reportRewardTransactionModel: Model<ReportUniqueRewardTransactionDocument>,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,

    @InjectModel(KeywordApprovalLog.name)
    private keywordApprovalLogModel: Model<KeywordApprovalLogDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * General Function
   */
  private async pushIfNotExist(array, data) {
    if (data && array.indexOf(data) == -1) {
      array.push(data);
    }
  }

  private async createIfNotExist(model, classify, data) {
    const response = new GlobalTransactionResponse();

    const newData = await new model(data);
    const dataExistence = await model.findOne(data).then((res) => res);
    if (dataExistence) {
      // console.log(
      //   `Data Exist : (${dataExistence.period} -  ${dataExistence.type}, ${dataExistence.merchant}, ${dataExistence.keyword})`,
      // );

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Data Exist';
      response.transaction_classify = `DATA_EXIST_${classify}`;
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
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = classify;
        response.payload = {
          trace_id: true,
          period: data.period,
          type: data.type,
          merchant: data.merchant,
          keyword: data.keyword,
        };

        return response;
      });
  }

  /**
   * Reporting Function
   */
  private async countTransactionReporting(model, payload: any) {
    const dateLastYear = await this.countTransactionReportingDateLastYear(
      model,
      payload,
    );

    const dateLastMonth = await this.countTransactionReportingDateLastMonth(
      model,
      payload,
    );

    const dateToday = await this.countTransactionReportingDateToday(
      model,
      payload,
    );

    const result = [dateLastYear, dateLastMonth, dateToday];
    return await result;
  }

  private async countTransactionReportingDateLastYear(model, payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'years')
      .toISOString();

    return await this.counterTransaction(model, {
      period: end_period,
      report_name: 'Date Last Year',
    });
  }

  private async countTransactionReportingDateLastMonth(model, payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.counterTransaction(model, {
      period: end_period,
      report_name: 'Date Last Month',
    });
  }

  private async countTransactionReportingDateToday(model, payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.counterTransaction(model, {
      period: end_period,
      report_name: 'Date Today',
    });
  }

  private async counterTransaction(model, payload: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const year_to_date = moment(end_period)
      .startOf('year')
      .format('YYYY-MM-DD');

    const merchant = await this.counterGroup(
      model,
      year_to_date,
      end_period,
      'merchant',
    );

    const keyword = await this.counterGroup(
      model,
      year_to_date,
      end_period,
      'keyword',
    );

    let result;

    if (
      merchant.length > 0 &&
      merchant[0]['count'] &&
      keyword.length > 0 &&
      keyword[0].count
    ) {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        merchant: merchant[0]['count'],
        keyword: keyword[0]['count'],
      };
    } else {
      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        merchant: 0,
        keyword: 0,
      };
    }

    return result;
  }

  private async counterGroup(model: any, from: any, to: any, column: string) {
    // return [];

    // benerin logic --> pak wilyu
    return [];
    // await model
    //   .aggregate([
    //     {
    //       $match: {
    //         [column]: {
    //           $ne: null,
    //         },
    //         period: {
    //           $gte: from,
    //           $lte: to,
    //         },
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: `$${column}`,
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: null,
    //         count: {
    //           $sum: 1,
    //         },
    //       },
    //     },
    //   ])
    //   .exec();
  }

  async updateRewardReport(payload: any) {
    const reward_transaction = await this.countTransactionReporting(
      this.reportRewardTransactionModel,
      payload,
    );

    const reward_live_system = await this.countTransactionReporting(
      this.reportRewardLiveSystemModel,
      payload,
    );

    await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          reward_trx: reward_transaction,
          reward_live_system: reward_live_system,
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
  }

  /**
   * Live System
   */

  private async activeList() {
    const query = [];

    query.push({
      $lookup: {
        from: 'keywordapprovallogs',
        let: { keyword_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $unwind: '$status',
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              keyword: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $addFields: {
        lastApproval: {
          $arrayElemAt: ['$approval_log', -1],
        },
      },
    });

    query.push({
      $project: {
        _id: true,
        eligibility: true,
        approval_log: true,
        lastApproval: true,
      },
    });

    query.push({
      $match: {
        'eligibility.start_period': {
          $lte: new Date().toISOString(),
        },
        'eligibility.end_period': {
          $gte: new Date().toISOString(),
        },
        'lastApproval.status.set_value': {
          $regex: new RegExp('approved', 'i'),
        },
      },
    });

    return await this.keywordModel.aggregate(query, (err, result) => {
      return result;
    });
  }

  async createUniqueLiveSystemReport(period) {
    const keywordActive = [];
    const merchantActive = [];

    const activeList = await this.activeList();
    for (let i = 0; i < activeList.length; i++) {
      const data = activeList[i];

      this.pushIfNotExist(keywordActive, data._id.toString());
      this.pushIfNotExist(merchantActive, data.eligibility.merchant);
    }

    // merchant
    for (let m = 0; m < merchantActive.length; m++) {
      const merchant = merchantActive[m];

      await this.createIfNotExist(
        this.reportRewardLiveSystemModel,
        'UNIQUE_REWARD_LIVE_SYSTEM_REPORT',
        {
          period: period.slice(0, 10),
          type: 'Merchant',
          merchant: merchant,
          keyword: null,
        },
      );
    }

    // keyword
    for (let k = 0; k < keywordActive.length; k++) {
      const keyword = keywordActive[k];

      await this.createIfNotExist(
        this.reportRewardLiveSystemModel,
        'UNIQUE_REWARD_LIVE_SYSTEM_REPORT',
        {
          period: period.slice(0, 10),
          type: 'Keyword',
          merchant: null,
          keyword: keyword,
        },
      );
    }
  }

  /**
   * Transaction
   */
  async createUniqueRewardTransactionReport({
    period,
    type,
    merchant,
    keyword,
  }: ReportUniqueRewardTransaction): Promise<GlobalTransactionResponse> {
    return this.createIfNotExist(
      this.reportRewardTransactionModel,
      'UNIQUE_REWARD_TRANSACTION_REPORT',
      {
        period: period.slice(0, 10),
        type: type,
        merchant: merchant,
        keyword: keyword,
      },
    );
  }
}
