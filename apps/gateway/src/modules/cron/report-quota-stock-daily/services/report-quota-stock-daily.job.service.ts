import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

import { CronDataDTO } from '../dtos/cron-data.dto';
import { ReportParamDTO } from '../dtos/report-param.dto';

const moment = require('moment-timezone');

@Injectable()
export class ReportQuotaStockDailyJobService {
  constructor(
    @Inject('REPORTING_STATISTIC_PRODUCER')
    private readonly clientReporting: ClientKafka,
  ) {
    //
  }

  async runTheJobs(name, data: CronDataDTO) {
    this.initialJob(name);

    const date = moment().add(-1, 'days');
    await this.sendReportQuotaStockDailyService(date, { date: date, data });
  }

  initialJob(name) {
    console.log(`Job: ${name} is running`);
  }

  async sendReportQuotaStockDailyService(date: any, param: ReportParamDTO) {
    param.date = moment(date).format('DD-MM-YYYY');

    console.log(
      `[REPORT QUOTA STOCK DAILY] Publishing to reporting topic\n data: ${param}`,
    );
    const payload = {
      origin: 'cron',
      service_name: 'report_quota_stock_daily',
      running_at: date,
      target_topic: 'notification',
      parameter: param,
    };

    await this.clientReporting.emit(process.env.KAFKA_REPORTING_GENERATION_TOPIC, payload);
  }
}
