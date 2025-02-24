import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '@reporting_statistic/model/reporting.model';
import { ReportingStatisticService } from '@reporting_statistic/reporting_statistic.service';
import { Model } from 'mongoose';

import { MailService } from '@/mail/service/mail.service';

import { CronDataDTO } from './dtos/cron-data.dto';
import { ReportDTO } from './dtos/report.dto';
import { ReportParamDTO } from './dtos/report-param.dto';

const moment = require('moment-timezone');

@Injectable()
export class ReportWithStockJobService {
  constructor(
    private mailService: MailService,
    private reportService: ReportingStatisticService,

    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportModel: Model<ReportMonitoringDocument>,
  ) {
    //
  }

  async runTheJobs(name, data: CronDataDTO) {
    this.initialJob(name);

    const date = moment().subtract('day', 1);
    const report = await this.getReport();

    this.sendReport({ date: date, report, data });
  }

  initialJob(name) {
    console.log(`Job: ${name} is running`);
  }

  async getReport(): Promise<ReportDTO[]> {
    const data: ReportDTO[] = await this.reportModel.findOne();
    return data;
  }

  async sendReport(param) {
    console.log('[REPORT DAILY SUMMARY POIN] Sending email...');

    const date = moment(param.date);
    const formattedDate = date.format('YYYY-MM-DD');

    const result = await this.reportService.reportMessengerDailySummaryPoint({
      period: date,
    });

    this.mailService.sendMailConfirmation(param.data.recipient_emails, {
      title: `[${formattedDate}] Report Keyword: ${param.report.name}`,
      template: 'report/report_daily_summary_poin',
      data: {
        report_name: param.report.name,
        date: formattedDate,
        items: result,
      },
    });
  }
}
