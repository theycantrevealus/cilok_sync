import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import cronstrue from 'cronstrue';
import * as fs from 'fs';
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
import { LovDocument } from '@/lov/models/lov.model';

export class SftpGeneralCronService {
  // Server config has arrayed, so you can send to multiple server
  private sftpConfig: CronSftpServerConfig[];
  private cronConfig: CronConfig;
  private cronSetup: any;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private jobService: JobService,
    private lovModel: Model<LovDocument>,
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
  ) {}

  /**
   * 1#
   * IMPORTANT!
   * Run this function first for create instance of this service
   * Check ExampleJobService for the example
   */
  generateCronSetup(
    sftpConfig: CronSftpServerConfig[],
    cronSetupData: CronConfig,
  ) {
    this.sftpConfig = sftpConfig;
    this.cronConfig = cronSetupData;

    // cron config will store to lov collection
    let setupData = {
      generate_dir: this.cronConfig.generatedFile,
      server_destination: this.sftpConfig,
      file_extension: this.cronConfig.fileExtension.toLowerCase(),
    };

    setupData = { ...setupData, ...this.cronConfig.additionalData };
    this.cronSetup = {
      group_name: 'CRONJOB',
      set_value: this.cronConfig.cronName, //unique name of cronjob
      description: this.cronConfig.cronDesc,
      additional: {
        cronjob: {
          running: this.cronConfig.isRunning, //default start/stop
          interval: this.cronConfig.interval, //interval value for running cron
        },
        data: setupData,
      },
    };
  }

  /**
   * @deprecated
   * 2#
   * Call this function where implement the JobService interface,
   * inside runTheJobs function after do your logic
   * Check ExampleJobService for the example
   */
  sendFile() {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();

    const localFile = fs.createReadStream(this.cronConfig.generatedFile);

    const destinations = this.cronSetup.additional.data.server_destination;
    if (destinations?.length > 0) {
      for (let i = 0; i < destinations.length; i++) {
        sftp
          .connect({
            host: destinations[i].host,
            port: destinations[i].port,
            username: destinations[i].username,
            privateKey: fs.readFileSync(destinations[i].sshKey),
          })
          .then(() => {
            return sftp.put(localFile, destinations[i].dirName);
          })
          .then(() => {
            return sftp.end();
          })
          .catch((err) => {
            console.error(err.message);
          });
      }
    }
  }

  /**
   * 3#
   * This function for setup and run cronjob
   */
  async setAndRunCronJob() {
    this.deleteCronJob();

    const qConfig = await this.lovModel
      .findOne({
        group_name: this.cronSetup.group_name,
        set_value: this.cronSetup.set_value,
      })
      .exec();

    if (!qConfig) {
      const q = new this.lovModel(this.cronSetup);
      try {
        await q.save();
      } catch (err) {
        console.log('err' + err);
      }
    } else {
      this.cronSetup = qConfig;
    }

    const job = new CronJob(this.cronConfig.interval, async () => {
      this.jobService.runTheJobs(this.cronConfig.cronName.replace('_SUB', ''));
    });
    this.schedulerRegistry.addCronJob(this.cronConfig.cronName, job);
    job.start();

    console.log(
      `Cronjob: ${this.cronConfig.cronName} is created, (Running: ${
        this.cronConfig.isRunning
      }) (Interval: ${cronstrue.toString(this.cronConfig.interval)})`,
    );
  }

  /**
   * This function for remove older cronjob and add new cronjob
   */
  deleteCronJob() {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key, map) => {
      if (key === this.cronConfig.cronName) {
        this.schedulerRegistry.deleteCronJob(this.cronConfig.cronName);
      }
    });
  }
}
