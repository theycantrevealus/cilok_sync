import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import * as fs from 'fs';
import mongoose, { Model } from 'mongoose';
import { start } from 'repl';

import { scanFilesSpecificTypeOndir } from '@/application/utils/File/file-management.service';

import { ExceptionHandler } from '../../utils/logger/handler';
import { IAccount, LoggingData } from '../../utils/logger/transport';
import { CronConfig, CronConfigDocument } from './models/cron.config.model';
import { CronLog, CronLogDocument } from './models/cron.log.model';
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';

export enum CronOrigin {
  CRON = 'cron',
  FILE_MONITORING_BATCH_PROCESS = 'cron_file_monitoring_batch_process',
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @Inject('CRON_SERVICE_PRODUCER')
    private readonly clientCron: ClientKafka,

    @InjectModel(CronConfig.name)
    private cronConfigModel: Model<CronConfigDocument>,

    @InjectModel(CronLog.name)
    private cronLogModel: Model<CronLogDocument>,

    @Inject(MaxRedeemTresholdsService)
    private readonly maxRedeemTresholdsService: MaxRedeemTresholdsService,

    private schedulerRegistry: SchedulerRegistry,

    private readonly exceptionHandler: ExceptionHandler,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Start all cron when app running
   * and monitor if new cron has set and then start it
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async monitorAndRunAllCron() {
    const startTime = new Date();
    const result = { user_id: 'cron' };

    try {
      const serverIdentifier = process.env.SERVER_IDENTIFIER ?? '';

      const res = await this.cronConfigModel
        .find({ server_identifier: serverIdentifier })
        .exec();

      for (const item of res) {
        const checkJobs = this.schedulerRegistry.doesExist('cron', item.name);
        const startTimeLoop = new Date();

        // create to avoid error object id in mongoDB
        if (item._id === undefined) {
          continue;
        }

        if (item.is_running && item.need_restart) {
          // check if already set cronjob
          if (checkJobs) {
            this.schedulerRegistry.deleteCronJob(item.name);
          }
          await this.runJobs(item.type, item);
        } else if (item.is_running && !checkJobs) {
          // running the cronjob
          await this.runJobs(item.type, item);
        } else if (!item.is_running) {
          // if job already set, remove it
          if (checkJobs) {
            this.schedulerRegistry.deleteCronJob(item.name);
            this.logger.warn(`Cron '${item.name}' has been deleted...`);
            result['message'] = `Cron ${item.name} has been deleted`;

            // insert log
            await this.loggerCron(
              item,
              false,
              'Monitor And Run All Cron - Delete cron',
              result,
              startTimeLoop,
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }
    } catch (e) {
      const err = {
        ...result,
        message: e.message,
        stack: e.stack,
      };

      // insert log
      await this.loggerCron(
        { message: 'Read all cron config' },
        true,
        'Monitor And Run All Cron',
        err,
        startTime,
      );
    }
  }

  /**
   * Function for cron job
   */
  async runJobs(type: string, config: CronConfig) {
    const startTime = new Date();
    const result = { user_id: 'cron', message: '' };

    try {
      let job: CronJob;
      let runningStats = false;

      /**
       * Check if cron use period
       * If periode is set and date now less than start_date or
       * more than end_date, the cron will remove (if exists) and
       * directly return from this function
       */
      if (config.periode && config.periode.enable) {
        const startDate = new Date(config.periode.start_date);
        const endDate = new Date(config.periode.end_date);
        const dateNow = new Date();

        if (startDate > dateNow || endDate < dateNow) {
          const existsCron = this.schedulerRegistry.doesExist(
            'cron',
            config.name,
          );
          if (existsCron) {
            this.schedulerRegistry.deleteCronJob(config.name);
            await this.cronConfigModel
              .findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(config._id.toString()) },
                { is_running: false },
              )
              .exec();

            // insert log
            result.message = `Success disable cron ${config.name} by period`;
            await this.loggerCron(
              config,
              false,
              `Cron - runJobs disable cron ${config.name}`,
              result,
              startTime,
            );
          }

          return;
        }
      }

      /**
       * Check if type is service, file monitoring, email, or sms
       * Service will emit to define topic
       */
      switch (type) {
        // if type is service, emit payload to define topic
        // and its consumer will consume the data
        case 'SERVICE':
          job = new CronJob(config.interval, async () => {
            // this.logger.verbose(`Emit to topic: ${config.target_topic}`);
            const startTimeJob = new Date();

            // set origin in payload and emit
            config.payload.origin = CronOrigin.CRON;
            await this.clientCron.emit(config.target_topic, config.payload);

            // save to log
            const log = new this.cronLogModel({ cron_config: config });
            await log.save();

            // insert log
            const result = {
              user_id: 'cron',
              message: `Success emit payload to topic ${config.name}`,
            };
            await this.loggerCron(
              config,
              false,
              `Cron - runJobs (${config.name}) success emit`,
              result,
              startTimeJob,
            );
          });

          runningStats = true;
          break;

        // if type is file monitoring, first read file in dir
        // if file exists, emit payload to define topic
        case 'FILE-MONITORING':
          job = new CronJob(config.interval, async () => {
            this.logger.verbose(`${config.name} | Monitoring file...`);
            await this.fileMonitoring(config);
          });

          runningStats = true;
          break;

        case 'EMAIL':
          // todo running send email
          runningStats = true;
          break;

        case 'SMS':
          // todo running send sms
          runningStats = true;
          break;

        default:
          this.logger.error(`Cannot run cron, unknown type...`);
          break;
      }

      if (runningStats) {
        this.schedulerRegistry.addCronJob(config.name, job);
        job.start();

        let status = 'started';
        if (config.need_restart) {
          status = 'restarted';
          await this.cronConfigModel
            .findOneAndUpdate(
              { _id: new mongoose.Types.ObjectId(config._id.toString()) },
              { need_restart: false },
            )
            .exec();
        }

        await this.loggerCron(
          config,
          false,
          `Cron - runJobs (${config.name}) success ${status} job`,
          {
            ...result,
            message: `Success ${status} job: ${config.name}`,
          },
          startTime,
        );
        this.logger.verbose(`Job ${config.name} has ${status}...`);
      }
    } catch (e) {
      const err = {
        message: e.message,
        stack: e.stack,
      };

      // insert log
      await this.loggerCron(
        config,
        true,
        'Monitor And Run All Cron - Run Jobs',
        err,
        startTime,
      );
    }
  }

  /**
   * Setup cron
   * @param payload
   */
  async setupCron(payload: any) {
    try {
      const config = payload as CronConfig;
      await this.cronConfigModel
        .findOneAndUpdate(
          { type: config.type, name: config.name },
          {
            description: config.description,
            interval: config.interval,
            target_topic: config.target_topic,
            is_running: config.is_running,
            need_restart: config.need_restart,
            payload: config.payload,
            pending_for: config.pending_for,
          },
          { upsert: true, new: true },
        )
        .catch((e) => {
          // catch error when setup cron
        });
      /**
       * RESET MAX REDEEM COUNTER
       */
      if (payload?.service_name?.toUpperCase() == 'RESET_MAX_REDEEM_COUNTER') {
        await this.maxRedeemTresholdsService.cronResetMaxRedeemCounter();
      }
    } catch (error) {
      console.log('ERROR', error.message);
      return;
    }
  }

  /**
   * For monitoring file and emit payload if file is exists
   * The contents of the payload will be added 2 keys:
   * - origin -> for logic check sftp incoming service
   * - file -> array of file to read
   * @param config
   */
  async fileMonitoring(config: CronConfig) {
    const startTime = new Date();

    try {
      const fileConfig = config.payload.file_config;

      // check file if exists
      if (!fs.existsSync(fileConfig.dir)) {
        this.logger.error(`There's no directory like "${fileConfig.dir}"`);
        return false;
      }
      const files = scanFilesSpecificTypeOndir(
        fileConfig.dir,
        fileConfig.file_type,
        [],
      );
      if (files.length == 0) {
        this.logger.verbose(`${config.name} | There is no file to read...`);

        const err = {
          user_id: 'cron',
          message: `${config.name}: there is no file to read...`,
          stack: `${config.name}: cannot read file because files not exists`,
        };

        // insert log
        await this.loggerCron(
          config,
          false,
          'Monitor And Run All Cron - fileMonitoring',
          err,
          startTime,
          HttpStatus.BAD_REQUEST,
        );
        return false;
      }

      // set origin and file path to read
      config.payload.origin = CronOrigin.FILE_MONITORING_BATCH_PROCESS;
      config.payload.files = files;
      config.payload.file_config = fileConfig;

      // emit sftp incoming
      await this.clientCron.emit(config.target_topic, config.payload);
      this.logger.verbose(
        `${config.name} | Emit to topic: ${config.target_topic}`,
      );

      // save to log
      const log = new this.cronLogModel({ cron_config: config });
      await log.save();

      // insert log
      const resultLog = {
        user_id: 'cron',
        message: `Success run fileMonitoring for ${config.name}`,
      };
      await this.loggerCron(
        config,
        false,
        'Monitor And Run All Cron - fileMonitoring',
        resultLog,
        startTime,
      );
    } catch (e) {
      const err = {
        user_id: 'cron',
        message: e.message,
        stack: e.stack,
      };

      // insert log
      await this.loggerCron(
        config,
        true,
        'Monitor And Run All Cron - File Monitoring',
        err,
        startTime,
      );
    }
  }

  async loggerCron(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload?.tracing_id ?? '-',
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'cron',
        service: CronService.name,
        step: step,
        taken_time: takenTime,
        result: result,
        param: payload,
        payload: {
          service: CronService.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
