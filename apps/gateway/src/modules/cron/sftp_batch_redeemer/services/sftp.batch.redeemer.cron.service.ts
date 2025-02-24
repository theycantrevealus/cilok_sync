import { Lov, LovDocument } from '@/lov/models/lov.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import cronstrue from 'cronstrue';
import { SftpbatchRedeemerJobService } from './sftp.batch.redeemer.job.service';

@Injectable()
export class SftpbatchRedeemerCronService {

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    private jobService: SftpbatchRedeemerJobService,

  ) { }

  cronSetup() {
    // cron config will store to lov collection
    const data = {
      "group_name": 'CRONJOB',
      "set_value": 'SFTP_BATCH_REDEEMER', //unique name of cronjob
      "description": 'SFTP for generate customer redeemer data and send file to another server',
      "additional": {
        'cronjob': {
          'running': false, //default start/stop
          'interval': "0 0 */1 * *", //interval value for running cron
        },
        'data': {
          keyword_list: ["keyword_name1", "keyword_name2"],
          generate_dir: './generate/keyword_redeemer',
          server_destination: [
            {
              host: '18.143.54.48',
              port: 22,
              username: 'ec2-user',
              sshkey: './keys/weGIV-sandbox-201910.pem',
              dir_name: './keyword_redeemer',
            }
          ]
        }
      }
    }
    return data;
  }

  @Cron('* * * * * *', {
    name: 'SFTP_BATCH_REDEEMER' //unique name of cronjob (must be same with cronSetup value)
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
    const cronToString = cronstrue.toString(cronSetup.additional.cronjob.interval);
    console.log(`Cronjob: ${cronSetup.set_value} is created, (Running:${running}) (Interval:${cronstrue.toString(interval)})`);
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
      this.addCronJob(cronSetup);
    }
  }

  addCronJob(cronSetup: any) {
    const job = new CronJob(cronSetup.additional.cronjob.interval, async () => {
      this.jobService.runTheJobs(cronSetup);
    });
    this.schedulerRegistry.addCronJob(`${cronSetup.set_value}_SUB`, job);
    job.start();
  }


}
