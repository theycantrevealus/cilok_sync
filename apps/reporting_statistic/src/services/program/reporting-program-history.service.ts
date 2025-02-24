import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import * as moment from 'moment';
import mongoose, { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import {
  ReportProgramHistory,
  ReportProgramHistoryDocument,
} from '../../model/program/unique.program.history.model';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../model/reporting.model';

@Injectable()
export class ReportingProgramHistoryService {
  constructor(
    @InjectModel(ReportProgramHistory.name, 'reporting')
    private reportProgramHistory: Model<ReportProgramHistoryDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    private appsService: ApplicationService,
  ) {}

  async reportingProgramHistoryCreate(subtract) {
    console.log('subtract agung : ', subtract);
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const today = moment().subtract(subtract, 'days').format('YYYY-MM-DD');
      const lastMonth = moment()
        .subtract(1, 'month')
        .subtract(subtract, 'days')
        .format('YYYY-MM-DD');
      const lastYear = moment()
        .subtract(1, 'year')
        .subtract(subtract, 'days')
        .format('YYYY-MM-DD');

      const dataKeywordDaily = await this.counterGroupKeyword(
        today,
        'eligibility.name',
      );
      const dataKeywordMonth = await this.counterGroupKeyword(
        lastMonth,
        'eligibility.name',
      );
      const dataKeywordYearly = await this.counterGroupKeyword(
        lastYear,
        'eligibility.name',
      );

      // console.log(dataKeywordDaily, 'dataKeywordDaily');
      // console.log(dataKeywordMonth, 'dataKeywordMonth');
      // console.log(dataKeywordYearly, 'dataKeywordYearly');

      console.log('Date Today : ', today);

      const results = [
        this.getResultPayload(dataKeywordYearly, lastYear, 'Date Last Year'),
        this.getResultPayload(dataKeywordMonth, lastMonth, 'Date Last Month'),
        this.getResultPayload(dataKeywordDaily, today, 'Date Today'),
      ];

      console.log('results : ', results);

      await this.reportMonitoringModel
        .findOneAndUpdate(
          {
            period: today,
          },
          {
            program: results,
          },
        )
        .then((res) => {
          return res;
        });
      // console.log(newData, '<--- reporting program history end --->');

      serviceResult.message = 'Reporting program history create';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  private async counterGroupKeyword(period: any, column: string) {
    const keywordApproval = await this.appsService.getConfig(
      'DEFAULT_STATUS_KEYWORD_APPROVE_HQ',
    );

    const queryAgg = [
      {
        $match: {
          [column]: { $ne: null },
          ['eligibility.start_period']: { $lte: new Date(period) },
          ['eligibility.end_period']: { $gte: new Date(period) },
          'bonus.bonus_type': {
            $in: [
              'lucky_draw',
              'telco_postpaid',
              'telco_prepaid',
              'direct_redeem',
            ],
          },
          keyword_approval: {
            $eq: new mongoose.Types.ObjectId(keywordApproval),
          },
        },
      },
    ];

    console.log(
      `=>> Query Program period ${period} : ${JSON.stringify(queryAgg)}`,
    );
    return await this.keywordModel.aggregate(queryAgg);
  }

  private getResultPayload(
    dataKeyword: any,
    period: string,
    reportName: string,
  ) {
    const keyword = dataKeyword.length ? dataKeyword.length : 0;
    const program = this.countUniqueProgramIds(dataKeyword);
    console.log(program, 'count program');
    const result = {
      name: reportName,
      period: period,
      keyword: keyword,
      program: program,
    };
    return result;
  }

  private countUniqueProgramIds(arr: any[]) {
    const programIds: any = {};
    arr.forEach((obj) => {
      const programId = obj.eligibility.program_id;
      if (programIds[programId]) {
        return;
      }
      programIds[programId] = true;
    });
    return Object.keys(programIds).length;
  }
}
