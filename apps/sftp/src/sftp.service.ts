import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Queue } from 'bull';
import { CronJob } from 'cron';
import mongoose, { Model } from 'mongoose';

import { ExceptionHandler } from '../../utils/logger/handler';
import { CSV_TYPE } from './configs/parameter.config';
import { SftpConfig, SftpConfigDocument } from './models/sftp.config.model';
import { SftpIncomingConfig } from './models/sftp.incoming.config';
import { SftpOutgoingConfig } from './models/sftp.outgoing.config';
import {
  SftpOutgoingLog,
  SftpOutgoingLogDocument,
} from './models/sftp.outgoing.log';
import { SftpSendService } from './service/sftp.send.service';

@Injectable()
export class SftpService {
  protected loadFileQueue: Queue;

  constructor(
    @InjectModel(SftpConfig.name)
    private sftpConfigModel: Model<SftpConfigDocument>,
    @InjectModel(SftpOutgoingLog.name)
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
    @InjectQueue('sftp')
    loadFileQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
    @Inject('SFTP_SERVICE_PRODUCER')
    private readonly clientSFTP: ClientKafka,

    private readonly exceptionHandler: ExceptionHandler,
  ) {
    this.loadFileQueue = loadFileQueue;
  }

  /**
   * Orchestrator function for define action for every request
   * @param payload
   */
  async sftp(payload: any) {
    switch (payload.request) {
      case 'setup':
        await this.sftpNewSetup(payload.data);
        break;

      case 'update':
        await this.sftpUpdate(payload.data);
        break;

      case 'delete':
        await this.sftpDelete(payload.data);
        break;

      default:
        console.log('No sftp action');
        break;
    }
  }

  /**
   * Add new sftp config
   * @param payload
   */
  async sftpNewSetup(payload: any) {
    console.log('Check payload...');
    if (!this.validatePayload(payload)) {
      return;
    }

    console.log('Try to set job...');
    const res = await this.sftpConfigModel.findOne({
      job_group: payload.job_group,
    });

    if (res) {
      console.log(`Cron for group ${payload.job_group} already set`);
      return;
    }

    payload.file_type.toLowerCase();
    const newData = new this.sftpConfigModel({
      ...payload,
    });

    await newData
      .save()
      .catch((e: BadRequestException) => {
        throw new BadRequestException(e.message);
      })
      .then((cronData) => {
        // setup and launch cronjob
        const job = new CronJob(cronData.interval, async () => {
          await this.extractFile(cronData);
        });
        this.schedulerRegistry.addCronJob(cronData.job_group, job);
        job.start();
        console.log(
          `Sftp job for group ${cronData.job_group} has successfully set...`,
        );
      });

    return;
  }

  /**
   * Update sftp config
   * @param payload
   */
  async sftpUpdate(payload: any) {
    if (!this.validatePayload(payload)) {
      return;
    }

    const job = this.schedulerRegistry.getCronJobs();
    job.forEach((value, key) => {
      if (key === payload.job_group) {
        this.schedulerRegistry.deleteCronJob(payload.job_group);
        console.log(`Take down cronjob for group ${payload.job_group}`);
      }
    });

    await this.sftpConfigModel
      .updateOne(
        {
          type: payload.type,
          job_group: payload.job_group,
        },
        { ...payload },
      )
      .then((_) => {
        const job = new CronJob(payload.interval, async () => {
          await this.extractFile(payload);
        });
        this.schedulerRegistry.addCronJob(payload.job_group, job);
        job.start();
        console.log(`Reset cronjob for group ${payload.job_group}`);
      });

    return;
  }

  /**
   * Delete sftp config
   * @param payload
   */
  async sftpDelete(payload: any) {
    if (!this.validatePayload(payload)) {
      return;
    }

    const job = this.schedulerRegistry.getCronJobs();
    job.forEach((value, key) => {
      if (key === payload.job_group) {
        this.schedulerRegistry.deleteCronJob(payload.job_group);
      }
    });

    await this.sftpConfigModel.findOneAndDelete({
      type: payload.type,
      job_group: payload.job_group,
    });
  }

  /**
   * CAUTION
   * This only user for testing
   */
  async testExtractFile() {
    const additional = {
      file_type: CSV_TYPE,
      file_path: './incoming_file/test.csv',
      column_delimiter: '|',
      expect_column: 'msisdn|name',
    };

    const payload = {
      request: 'setup',
      data: {
        _id: new mongoose.Types.ObjectId('638dfb74c6f5baba6235582b'),
        type: 'IN',
        job_group: 'TEST_SFTP_INCOMING_JOB',
        interval: '*/10 * * * *',
        additional: additional,
      },
    };

    await this.sftp(payload);
  }

  /**
   * Core function for extract the file
   * Using nest/bull for process big file
   * @param config
   */
  async extractFile(config: SftpConfig) {
    return this.loadFileQueue
      .add('sftp-file-read', config, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Validate column need for Sftp Config collection
   * @param payload
   */
  validatePayload(payload: any): boolean {
    if (!payload.hasOwnProperty('type')) {
      return false;
    }

    if (!payload.hasOwnProperty('job_group')) {
      return false;
    }

    if (!payload.hasOwnProperty('interval')) {
      return false;
    }

    if (!payload.hasOwnProperty('file_type')) {
      return false;
    }

    if (!payload.hasOwnProperty('expect_column')) {
      return false;
    }

    return true;
  }

  /**
   * Send file by message broker
   * @param payload
   */
  async sftpOutgoing(payload: any) {
    const config = payload as SftpOutgoingConfig;
    const sftpSend = new SftpSendService(
      config,
      this.sftpOutgoingLogModel,
      this.exceptionHandler,
    );
    return await sftpSend.fileMonitoringOrDirectSendFile();
  }

  /**
   * service outhoing image SFTp without retry
   * @param payload data to sftp
   * @param retry number of retry and default 0
   * @returns 
   * @deprecated the new service sftpOutgoingImageWithRetry
   */
  async sftpOutgoingImage(payload: any) {
    const config = payload as SftpOutgoingConfig;
    const sftpSend = new SftpSendService(
      config,
      this.sftpOutgoingLogModel,
      this.exceptionHandler,
    );
    return await sftpSend.sendFile();
  }

  /**
   * Read file by message broker
   * Using bull for load big data
   * @param payload
   */
  async sftpIncoming(payload: any) {
    const config = payload as SftpIncomingConfig;
    return await this.loadFileQueue
      .add('sftp-file-read', config, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Read file by message broker for batch process
   * Using bull for load big data
   * @param payload
   */
  async sftpIncomingBatchProcess(payload: any) {
    return await this.loadFileQueue
      .add('sftp-batch-process-file-read', payload, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * service outhoing image SFTp with retry
   * @param payload data to sftp
   * @param retry number of retry and default 0
   * @returns 
   */
  async sftpOutgoingImageWithRetry(payload: any, retry?: number) {
    console.log("uploading image to sftp!");
    try {
      const config = payload as SftpOutgoingConfig;
      const sftpSend = new SftpSendService(
        config,
        this.sftpOutgoingLogModel,
        this.exceptionHandler,
      );
      const sftpProcess =  await sftpSend.sendFile();
      if (sftpProcess) {
        return sftpProcess
      } else {
        if (retry > 0) {
          console.log("Retry Process to SFTP ", retry);
          const count = retry - 1;
          setTimeout(async () => {
              return await this.sftpOutgoingImageWithRetry(payload, count);
          }, 1000);
        }
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    console.log("image to sftp uploded!");
  }
  
}
