import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

import { ReportParamDTO } from '../dtos/report-param.dto';

const moment = require('moment-timezone');

@Injectable()
export class ReportRedeemTransactionJobService {
  constructor(
    @Inject('REPORTING_GENERATION_PRODUCER')
    private readonly clientReporting: ClientKafka,
  ) {
    //
  }

  async runTheJobs(name, data: any) {
    this.initialJob(name);

    const date = moment().add(-1, 'days');
    await this.sendReportRedeemTransactionService(date, data);
  }

  initialJob(name) {
    console.log(`Job: ${name} is running`);
  }

  async sendReportRedeemTransactionService(date: any, param: ReportParamDTO) {
    param.date = date;

    console.log(
      `[REPORT REDEEM TRANSACTION] Publishing to reporting topic\n data: ${param}`,
    );
    const payload = {
      origin: 'cron',
      service_name: 'report_redeem_transaction',
      running_at: date,
      target_topic: 'sftp-outgoing',
      parameter: param,
    };

    await this.clientReporting.emit(process.env.KAFKA_REPORTING_GENERATION_TOPIC, payload);
  }
}
