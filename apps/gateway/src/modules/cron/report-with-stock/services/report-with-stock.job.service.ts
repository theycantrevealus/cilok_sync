import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MailService } from '@/mail/service/mail.service';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { ReportKeywordService } from '@/report/services/report-keyword.service';
import { ReportTrendChannelRedeemerService } from '@/report/services/report-trend-channel-redeemer.service';
import { ReportTrendErrorRedeemService } from '@/report/services/report-trend-error-redeem.service';

import { CronDataDTO } from '../dtos/cron-data.dto';
import { ProgramDTO } from '../dtos/program.dto';
import { ReportParamDTO } from '../dtos/report-param.dto';

const moment = require('moment-timezone');

@Injectable()
export class ReportWithStockJobService {
  constructor(
    private mailService: MailService,
    private reportKeywordService: ReportKeywordService,
    private reportTrendChannelRedeemerService: ReportTrendChannelRedeemerService,
    private reportTrendErrorRedeemService: ReportTrendErrorRedeemService,

    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
  ) {
    //
  }

  async runTheJobs(name, data: CronDataDTO) {
    this.initialJob(name);

    const date = moment().subtract('day', 1);
    const programs = await this.getAllPrograms();

    programs.forEach((program) => {
      this.sendReportKeyword({ date: date, program, data });
      this.sendReportTrendChannelRedeemer({ date: date, program, data });
      this.sendReportTrendErrorRedeem({ date: date, program, data });
    });
  }

  initialJob(name) {
    console.log(`Job: ${name} is running`);
  }

  async getAllPrograms(): Promise<ProgramDTO[]> {
    const data: ProgramDTO[] = await this.programModel
      .aggregate([
        {
          $project: {
            _id: 1,
            name: 1,
          },
        },
      ])
      .exec();

    return data;
  }

  async sendReportKeyword(param: ReportParamDTO) {
    console.log('[REPORT KEYWORD] Sending email...');

    const date = moment(param.date);
    const formattedDate = date.format('YYYYMMDD');

    const result = await this.reportKeywordService.list({
      program: String(param.program._id),
      start_date: date.format('YYYY-MM-DD'),
      end_date: date.format('YYYY-MM-DD'),
    });

    this.mailService.sendMailConfirmation(param.data.recipient_emails, {
      title: `[${formattedDate}] Report Keyword: ${param.program.name}`,
      template: 'report/report_keyword',
      data: {
        program_name: param.program.name,
        date: formattedDate,
        items: result?.payload.data.map((item) => ({
          date: moment(item?.date).format('YYYYMMDD'),
          keyword_name: item?.keyword_detail?.name,
          total_success: item?.total_success?.toLocaleString(),
          total_failed: item?.total_failed?.toLocaleString(),
          total_transaction: item?.total_transaction?.toLocaleString(),
          remaining_stock: item?.remaining_stock?.toLocaleString(),
          default_stock: item?.default_stock?.toLocaleString(),
        })),
      },
    });
  }

  async sendReportTrendChannelRedeemer(param: ReportParamDTO) {
    console.log('[REPORT TREND CHANNEL REDEEMER] Sending email...');

    const date = moment(param.date);
    const formattedDate = date.format('YYYYMMDD');

    const result = await this.reportTrendChannelRedeemerService.list({
      program: String(param.program._id),
      start_date: date.format('YYYY-MM-DD'),
      end_date: date.format('YYYY-MM-DD'),
    });

    this.mailService.sendMailConfirmation(param.data.recipient_emails, {
      title: `[${formattedDate}] Report Trend Channel Redeemer: ${param.program.name}`,
      template: 'report/report_trend_channel_redeemer',
      data: {
        program_name: param.program.name,
        date: formattedDate,
        items: result?.payload.data.map((item) => ({
          date: moment(item?.date).format('YYYYMMDD'),
          channel_name: item?.channel_detail?.name,
          total_redeem: item?.total_redeem?.toLocaleString(),
          total_msisdn: item?.total_msisdn?.toLocaleString(),
        })),
      },
    });
  }

  async sendReportTrendErrorRedeem(param: ReportParamDTO) {
    console.log('[REPORT TREND ERROR REDEEMER] Sending email...');

    const date = moment(param.date);
    const formattedDate = date.format('YYYYMMDD');

    const result = await this.reportTrendErrorRedeemService.list({
      program: String(param.program._id),
      start_date: date.format('YYYY-MM-DD'),
      end_date: date.format('YYYY-MM-DD'),
    });

    this.mailService.sendMailConfirmation(param.data.recipient_emails, {
      title: `[${formattedDate}] Report Trend Error Redeem: ${param.program.name}`,
      template: 'report/report_trend_error_redeem',
      data: {
        program_name: param.program.name,
        date: formattedDate,
        items: result?.payload.data.map((item) => ({
          date: moment(item?.date).format('YYYYMMDD'),
          keyword_name: item?.keyword_detail?.name,
          log_event: item?.log_event,
          notification: item?.notification,
          total: item?.total?.toLocaleString(),
        })),
      },
    });
  }
}
