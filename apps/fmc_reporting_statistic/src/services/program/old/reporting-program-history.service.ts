import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import * as moment from 'moment';
import { Model } from 'mongoose';

import {
  ReportProgramHistory,
  ReportProgramHistoryDocument,
} from '../../../model/program/unique.program.history.model';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../../../model/reporting.model';

@Injectable()
export class ReportingProgramHistoryService {
  constructor(
    @InjectModel(ReportProgramHistory.name)
    private reportProgramHistory: Model<ReportProgramHistoryDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
  ) {}

  async reportingProgramHistoryCreate(payload: any) {
    const dataExistence = await this.reportProgramHistory
      .findOne({
        period: payload.period,
        program: new ObjectId(payload.program),
      })
      .then((res) => {
        return res;
      });
    if (!dataExistence) {
      const newData = new this.reportProgramHistory({
        period: payload.period,
        program: new ObjectId(payload.program),
        keyword_list: [
          {
            keyword: new ObjectId(payload.keyword),
            bonus_type: payload.bonus_type,
          },
        ],
      });
      await newData.save();
      await this.reportingToMonitoringData(payload);
    } else {
      const isKeywordExist = dataExistence.keyword_list.some(
        (keyword) => keyword.keyword.toString() === payload.keyword,
      );

      if (!isKeywordExist) {
        await this.reportProgramHistory.findOneAndUpdate(
          {
            period: payload.period,
            program: new ObjectId(payload.program),
          },
          {
            $push: {
              keyword_list: {
                keyword: new ObjectId(payload.keyword),
                bonus_type: payload.bonus_type,
              },
            },
            updated_at: new Date(),
          },
        );
        await this.reportingToMonitoringData(payload);
      }
    }
  }

  async reportingToMonitoringData(payload: any) {
    const program_history = await this.countProgramHistory(payload);
    const newData = await this.reportMonitoringModel
      .findOneAndUpdate(
        {
          period: payload.period,
        },
        {
          program: program_history,
        },
      )
      .then((res) => {
        return res;
      });

    console.log(newData, '<--- reporting program history end --->');
  }

  async countProgramHistory(payload: any) {
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
      date: payload.period,
      report_name: 'Date Last Year',
      msisdn: payload.msisdn,
    });
  }

  async countDateLastMonth(payload: any) {
    const end_period = moment(payload.period)
      .subtract(1, 'months')
      .toISOString();

    return await this.counter({
      period: end_period,
      date: payload.period,
      report_name: 'Date Last Month',
      msisdn: payload.msisdn,
    });
  }

  async countDateToday(payload: any) {
    const end_period = moment(payload.period).toISOString();

    return await this.counter({
      period: end_period,
      date: payload.period,
      report_name: 'Date Today',
      msisdn: payload.msisdn,
    });
  }

  async counter(payload: any) {
    const end_period = moment(payload.period).format('YYYY-MM-DD');
    const lastMonth = moment(payload.date)
      .subtract(1, 'month')
      .startOf('month')
      .format('YYYY-MM-DD');
    const endOfLastMonth = moment(payload.date)
      .subtract(1, 'month')
      .endOf('month')
      .format('YYYY-MM-DD');
    const lastYear = moment(payload.date)
      .subtract(1, 'year')
      .startOf('year')
      .format('YYYY-MM-DD');
    const endOfLastYear = moment(payload.date)
      .subtract(1, 'year')
      .endOf('year')
      .format('YYYY-MM-DD');

    let result = {};

    if (payload.report_name === 'Date Today') {
      const resultData = await this.reportProgramHistory.aggregate([
        {
          $unwind: '$keyword_list',
        },
        {
          $lookup: {
            from: 'keywords',
            localField: 'keyword_list.keyword',
            foreignField: '_id',
            as: 'keyword',
          },
        },
        {
          $match: {
            $or: [
              { 'keyword_list.bonus_type': /direct/ },
              { 'keyword_list.bonus_type': /telco_postpaid/ },
              { 'keyword_list.bonus_type': /lucky/ },
              { 'keyword_list.bonus_type': /telco_prepaid/ },
            ],
            period: end_period,
          },
        },
        {
          $group: {
            _id: '$program',
            count: { $sum: 1 },
          },
        },
      ]);

      let keyword = 0;

      for (let index = 0; index < resultData.length; index++) {
        const element = resultData[index];
        keyword += element.count;
      }

      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        program: resultData.length,
        keyword: keyword,
      };
    } else if (payload.report_name === 'Date Last Month') {
      const resultData = await this.reportProgramHistory.aggregate([
        {
          $unwind: '$keyword_list',
        },
        {
          $lookup: {
            from: 'keywords',
            localField: 'keyword_list.keyword',
            foreignField: '_id',
            as: 'keyword',
          },
        },
        {
          $match: {
            $or: [
              { 'keyword_list.bonus_type': /direct/ },
              { 'keyword_list.bonus_type': /telco_postpaid/ },
              { 'keyword_list.bonus_type': /lucky/ },
              { 'keyword_list.bonus_type': /telco_prepaid/ },
            ],
            period: { $gte: lastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: '$program',
            count: { $sum: 1 },
          },
        },
      ]);

      let keyword = 0;

      for (let index = 0; index < resultData.length; index++) {
        const element = resultData[index];
        keyword += element.count;
      }

      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        program: resultData.length,
        keyword: keyword,
      };
    } else if (payload.report_name === 'Date Last Year') {
      const resultData = await this.reportProgramHistory.aggregate([
        {
          $unwind: '$keyword_list',
        },
        {
          $lookup: {
            from: 'keywords',
            localField: 'keyword_list.keyword',
            foreignField: '_id',
            as: 'keyword',
          },
        },
        {
          $match: {
            $or: [
              { 'keyword_list.bonus_type': /direct/ },
              { 'keyword_list.bonus_type': /telco_postpaid/ },
              { 'keyword_list.bonus_type': /lucky/ },
              { 'keyword_list.bonus_type': /telco_prepaid/ },
            ],
            period: { $gte: lastYear, $lte: endOfLastYear },
          },
        },
        {
          $group: {
            _id: '$program',
            count: { $sum: 1 },
          },
        },
      ]);

      let keyword = 0;

      for (let index = 0; index < resultData.length; index++) {
        const element = resultData[index];
        keyword += element.count;
      }

      result = {
        name: payload.report_name,
        period: end_period.slice(0, 10),
        program: resultData.length,
        keyword: keyword,
      };
    }
    return result;
  }
}
