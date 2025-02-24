import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import cronstrue from 'cronstrue';
import { Model } from 'mongoose';

import { Lov, LovDocument } from '@/lov/models/lov.model';

import { ReportRedeemTransactionJobService } from './report-redeem-transaction.job.service';

const CRONJOB_NAME = 'REPORT_REDEEM_TRANSACTION';
const CRONJOB_DESCRIPTION ='Daily cronjob for Redeem Transaction';

@Injectable()
export class ReportRedeemTransactionCronService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    private reportRedeemTransactionJobService: ReportRedeemTransactionJobService,
  ) {}

  cronSetup() {
    // cron config will store to lov collection
    const data = {
      group_name: 'CRONJOB',
      set_value: CRONJOB_NAME, //unique name of cronjob
      description: CRONJOB_DESCRIPTION,
      additional: {
        cronjob: {
          running: false, //default start/stop
          interval: '0 0 0 * * *', //interval value for running cron
        },
        data: {
          generate_dir: './telkomsel_poin_atp_tr_redeem',
          server_destination: [
            {
              host: '18.143.54.48',
              port: 22,
              username: 'ec2-user',
              sshkey: './keys/weGIV-sandbox-201910.pem',
              dir_name: './telkomsel_poin_atp_tr_redeem',
            }
          ]
        },
      },
    };
    return data;
  }

  @Cron('* * * * * *', {
    name: CRONJOB_NAME, //unique name of cronjob (must be same with cronSetup value)
  })
  async handleCron() {
    let cronSetup = this.cronSetup();
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((value, key) => {
      if (key === `${cronSetup.set_value}_SUB`) {
        this.schedulerRegistry.deleteCronJob(`${cronSetup.set_value}_SUB`);
      }
    });

    const jobMonitor = this.schedulerRegistry.getCronJob(cronSetup.set_value);
    jobMonitor.stop();

    let running = cronSetup.additional.cronjob.running;
    let interval = cronSetup.additional.cronjob.interval;

    const qConfig = await this.lovModel
      .findOne({
        group_name: cronSetup.group_name,
        set_value: cronSetup.set_value,
      })
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

    console.log(
      `Cronjob: ${
        cronSetup.set_value
      } is created, (Running:${running}) (Interval:${cronstrue.toString(
        interval,
      )})`,
    );
    this.runSubCronjob(cronSetup);
  }

  runSubCronjob(cronSetup) {
    if (cronSetup.additional.cronjob.running) {
      const jobs = this.schedulerRegistry.getCronJobs();
      jobs.forEach((value, key) => {
        if (key === `${cronSetup.set_value}_SUB`) {
          this.schedulerRegistry.deleteCronJob(`${cronSetup.set_value}_SUB`);
        }
      });
      this.addCronJob(
        `${cronSetup.set_value}_SUB`,
        cronSetup.additional.cronjob.interval,
        cronSetup.additional.data,
      );
    }
  }

  addCronJob(name: string, cronTime: string, data: any) {
    const job = new CronJob(cronTime, async () => {
      this.reportRedeemTransactionJobService.runTheJobs(name.replace('_SUB', ''), data);
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }
}
