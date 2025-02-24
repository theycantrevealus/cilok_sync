import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { Model } from 'mongoose';

import {
  CronConfig,
  CronSftpServerConfig,
} from '@/cron/sftp/config/cron.config';
import { JobService } from '@/cron/sftp/contract/job.service';
import {
  SftpOutgoingLog,
  SftpOutgoingLogDocument,
} from '@/cron/sftp/model/sftp.outgoing.log';
import { SftpGeneralCronService } from '@/cron/sftp/services/sftp.general.cron.service';
import { SftpSendService } from '@/cron/sftp/services/sftp.send.service';
import { Lov, LovDocument } from '@/lov/models/lov.model';

/**
 * This is example for implement sftp send file general service
 */
@Injectable()
export class ExampleJobSetup {
  private readonly sftpConfig: CronSftpServerConfig[];
  private readonly cronConfig: CronConfig;
  private sftpGeneralCron: SftpGeneralCronService;

  constructor(
    private schedulerRegistry: SchedulerRegistry,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(SftpOutgoingLog.name)
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
  ) {
    // set cron config
    this.cronConfig = new CronConfig();
    this.cronConfig.cronName = 'TEST_CRON';
    this.cronConfig.cronDesc = 'Description for cron test';
    this.cronConfig.isRunning = true;
    this.cronConfig.interval = CronExpression.EVERY_10_SECONDS;
    this.cronConfig.generatedFile = './generate/data1.json';

    // set sftp config
    this.sftpConfig = [];
    this.sftpConfig.push(
      new CronSftpServerConfig(
        'IDAM',
        '18.143.54.48',
        22,
        'ec2-user',
        './keys/weGIV-sandbox-201910.pem',
        `./sftp-general-test1.json`,
      ),
    );
  }

  /**
   * Set sftpSend for inject at ExampleJobService,
   * And ExampleJobService will be injected at SftpGeneralCronService
   */
  async runCronJob() {
    const sftpSend = new SftpSendService(
      this.cronConfig,
      this.sftpConfig,
      this.sftpOutgoingLogModel,
    );

    this.sftpGeneralCron = new SftpGeneralCronService(
      this.schedulerRegistry,
      new ExampleJobService(sftpSend),
      this.lovModel,
      this.sftpOutgoingLogModel,
    );

    // set data type and additional data
    this.cronConfig.fileExtension = 'json';
    this.cronConfig.additionalData = { keyword: 'HPTEST1' };

    // instance the cron setup
    this.sftpGeneralCron.generateCronSetup(this.sftpConfig, this.cronConfig);
    await this.sftpGeneralCron.setAndRunCronJob();
  }
}

/**
 * Use sendFile from SftpSend class.
 * Set all service or model at the constructor, don't use injection
 * This class not injectable
 */
export class ExampleJobService implements JobService {
  private sftpSend: SftpSendService;

  constructor(sftpSend: SftpSendService) {
    this.sftpSend = sftpSend;
  }

  async runTheJobs(cronName: string): Promise<void> {
    await this.sftpSend.sendFile();
  }
}
