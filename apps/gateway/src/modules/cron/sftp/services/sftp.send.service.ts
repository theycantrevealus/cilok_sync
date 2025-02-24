import * as fs from "fs";
import {CronConfig, CronSftpServerConfig} from "@/cron/sftp/config/cron.config";
import {Model} from "mongoose";
import {SftpOutgoingLogDocument} from "@/cron/sftp/model/sftp.outgoing.log";

/**
 * This service only provide for sftp using multiple server
 */
export class SftpSendService {

  private cronConfig: CronConfig;
  private cronSetup: CronSftpServerConfig[];
  private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>;

  constructor(
    cronConfig: CronConfig,
    cronSetup: any,
    sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
  ) {
    this.cronConfig = cronConfig;
    this.cronSetup = cronSetup;
    this.sftpOutgoingLogModel = sftpOutgoingLogModel;
  }

  /**
   * Call this function where implement the JobService interface,
   * inside runTheJobs function after do your logic
   * Check ExampleJobService for the example
   */
  async sendFile() {
    let Client = require('ssh2-sftp-client');
    let sftp = new Client();

    let localFile = await fs.createReadStream(this.cronConfig.generatedFile);

    if (this.cronSetup.length > 0) {
      for (let i = 0; i < this.cronSetup.length; i++) {
        sftp.connect({
          host: this.cronSetup[i].host,
          port: this.cronSetup[i].port,
          username: this.cronSetup[i].username,
          privateKey: fs.readFileSync(this.cronSetup[i].sshKey),
        })
          .then(() => {
            // add timestamp to file name
            const fileWithTimestamp = `${this.cronSetup[i].fileAndPath}.${Date.now()}`;
            return sftp.put(localFile, fileWithTimestamp);
          })
          .then(async () => {
            console.log(`File ${this.cronConfig.generatedFile} has send to ${this.cronSetup[i].host}`);

            let log = new this.sftpOutgoingLogModel({
              file_at_local: this.cronConfig.generatedFile,
              destination_label: this.cronSetup[i].label,
              host: this.cronSetup[i].host,
              file_path: this.cronSetup[i].fileAndPath,
            });
            await log.save();
            return sftp.end();
          })
          .catch(err => {
            console.error(err.message);
          });
      }
    }
  }
}
