import { Injectable } from '@nestjs/common';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';
import * as fs from 'fs';
import * as moment from 'moment';
import { CronConfig } from '@/cron/sftp/config/cron.config';
import { SftpSendService } from '@/cron/sftp/services/sftp.send.service';
import { InjectModel } from '@nestjs/mongoose';
import { SftpOutgoingLog, SftpOutgoingLogDocument } from '@/cron/sftp/model/sftp.outgoing.log';
import { Model } from 'mongoose';

@Injectable()
export class SftpbatchRedeemerNbpJobService {

  constructor(
    private redeemService: RedeemService,
    @InjectModel(SftpOutgoingLog.name)
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
  ) {

  }

  runTheJobs(cronSetup) {
    this.job1(cronSetup);
  }

  async job1(cronSetup) {
    const keywordList = cronSetup.additional.data.keyword_list;
    const customers = await this.redeemService.getCustomerRedeem(keywordList);

    if (customers.length > 0) {
      // generate file
      const fileName = `trx_0POIN_${moment(new Date(), "YYYY/MM/DD").format("YYYYMMDD")}.txt`;
      const dir = cronSetup.additional.data.generate_dir;
      const dirFile = `${dir}/${fileName}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // let content = 'MSISDN|KEYWORD\n'; //header
      let content = null;
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

      const SFTP = new SftpSendService(cronConfig, dst, this.sftpOutgoingLogModel);
      SFTP.sendFile();
    }
    console.log(`Cronjob: ${cronSetup.set_value} has been running`);
  }


  async runCopy(dstSetup, file) {
    let Client = require('ssh2-sftp-client');
    let sftp = new Client();

    let data = fs.createReadStream(file.local);
    let remote = file.remote;

    sftp.connect(
      {
        host: dstSetup.host,
        port: dstSetup.port,
        username: dstSetup.username,
        privateKey: fs.readFileSync(dstSetup.sshkey)
      }
    )
      .then(() => {
        return sftp.put(data, remote);
      })
      .then(() => {
        return sftp.end();
      })
      .catch(err => {
        console.error(err.message);
      });
  }



}
