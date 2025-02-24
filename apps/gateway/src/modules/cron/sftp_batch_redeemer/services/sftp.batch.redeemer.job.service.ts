import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';

import { CronConfig } from '@/cron/sftp/config/cron.config';
import {
  SftpOutgoingLog,
  SftpOutgoingLogDocument,
} from '@/cron/sftp/model/sftp.outgoing.log';
import { SftpSendService } from '@/cron/sftp/services/sftp.send.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

@Injectable()
export class SftpbatchRedeemerJobService {
  constructor(
    private redeemService: RedeemService,

    @InjectModel(SftpOutgoingLog.name)
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
  ) {}

  runTheJobs(cronSetup) {
    this.job1(cronSetup);
  }

  async job1(cronSetup) {
    const keywordList = cronSetup.additional.data.keyword_list;
    const customers = await this.redeemService.getCustomerRedeem(keywordList);

    if (customers.length > 0) {
      // generate file
      const curr_date = new Date().toISOString().split('T');
      const time = curr_date[1].split('.')[0].replace(/:/g, '-');
      const fileName = `KEYWORD_REDEEMER_${curr_date[0]}_${time}.csv`;
      const dir = cronSetup.additional.data.generate_dir;
      const dirFile = `${dir}/${fileName}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let content = 'MSISDN|KEYWORD\n';
      for (let index = 0; index < customers.length; index++) {
        content += `${customers[index].msisdn}|${customers[index].keyword}\n`;
      }
      fs.writeFileSync(dirFile, content);

      const dst = cronSetup.additional.data.server_destination;

      const cronConfig: CronConfig = new CronConfig();
      cronConfig.cronName = cronSetup.set_value;
      cronConfig.cronDesc = cronSetup.description;
      cronConfig.isRunning = cronSetup.additional.cronjob.running;
      cronConfig.interval = cronSetup.additional.cronjob.interval;
      cronConfig.additionalData = cronSetup.additional;
      cronConfig.generatedFile = fileName;
      cronConfig.fileExtension = '.csv';

      for (let index = 0; index < dst.length; index++) {
        dst[index].label = cronSetup.set_value;
        dst[index].sshKey = dst[index].sshkey;
        dst[index].fileAndPath = dst[index].dir_name;
      }

      const SFTP = new SftpSendService(
        cronConfig,
        dst,
        this.sftpOutgoingLogModel,
      );
      SFTP.sendFile();
    }
    console.log(`Cronjob: ${cronSetup.set_value} has been running`);
  }

  async runCopy(dstSetup, file) {
    // const Client = require('ssh2-sftp-client');
    // const sftp = new Client();

    // const data = fs.createReadStream(file.local);
    // const remote = file.remote;

    // sftp
    //   .connect({
    //     host: dstSetup.host,
    //     port: dstSetup.port,
    //     username: dstSetup.username,
    //     privateKey: fs.readFileSync(dstSetup.sshkey),
    //   })
    //   .then(() => {
    //     return sftp.put(data, remote);
    //   })
    //   .then(() => {
    //     return sftp.end();
    //   })
    //   .catch((err) => {
    //     console.error(err.message);
    //   });
  }
}
