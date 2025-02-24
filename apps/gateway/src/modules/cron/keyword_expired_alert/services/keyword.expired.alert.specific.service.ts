import { Lov, LovDocument } from '@/lov/models/lov.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import cronstrue from 'cronstrue';
import { KeywordExpiredAlertSpecificJobService } from './keyword.expired.alert.specific.job.service';

@Injectable()
export class KeywordExpiredAlertSpecificService {

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    private keywordExpiredAlertSpecificJobService: KeywordExpiredAlertSpecificJobService,
  ) { }

  cronSetup() {
    // cron config will store to lov collection
    const data = {
      "group_name": 'CRONJOB',
      "set_value": 'KEYWORD_EXPIRED_ALERT_SPECIFIC', //unique name of cronjob
      "description": 'Send email notification keyword to be expired to recipients with general threshold in day',
      "additional": {
        'cronjob': {
          'running': false, //default start/stop
          'interval': "0 0 */1 * *", //interval value for running cron
        },
        'data': null
      }
    }
    return data;
  }

  @Cron('* * * * * *', {
    name: 'KEYWORD_EXPIRED_ALERT_SPECIFIC' //unique name of cronjob (must be same with cronSetup value)
  })
  async handleCron() {
    let cronSetup = this.cronSetup();
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key, map) => {
      if (key === `${cronSetup.set_value}_SUB`) {
        this.schedulerRegistry.deleteCronJob(`${cronSetup.set_value}_SUB`);
      }
    });

    const jobMonitor = this.schedulerRegistry.getCronJob(cronSetup.set_value);
    jobMonitor.stop();

    let running = cronSetup.additional.cronjob.running;
    let interval = cronSetup.additional.cronjob.interval;

    const qConfig = await this.lovModel
      .findOne({ group_name: cronSetup.group_name, set_value: cronSetup.set_value })
      .exec();

    if (!qConfig) {
      const q = new this.lovModel(cronSetup);
      try {
        await q.save();
      } catch (err) {
        console.log('err' + err);
      }
    } else {
      cronSetup = qConfig;
      running = qConfig.additional.cronjob.running;
      interval = qConfig.additional.cronjob.interval;
    }
    const humanInterval = cronstrue.toString(cronSetup.additional.cronjob.interval);
    console.log(`Cronjob: ${cronSetup.set_value} is created, (Running:${running}) (Interval:${humanInterval})`);
    this.runSubCronjob(cronSetup);

  }

  runSubCronjob(cronSetup) {
    if (cronSetup.additional.cronjob.running) {
      const jobs = this.schedulerRegistry.getCronJobs();
      jobs.forEach((value, key, map) => {
        if (key === `${cronSetup.set_value}_SUB`) {
          this.schedulerRegistry.deleteCronJob(`${cronSetup.set_value}_SUB`);
        }
      });
      this.addCronJob(`${cronSetup.set_value}_SUB`, cronSetup.additional.cronjob.interval, cronSetup);
    }
  }

  addCronJob(name: string, cronTime: string, cronSetup:any) {
    const job = new CronJob(cronTime, async () => {
      this.keywordExpiredAlertSpecificJobService.runTheJobs(cronSetup);
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }


}
