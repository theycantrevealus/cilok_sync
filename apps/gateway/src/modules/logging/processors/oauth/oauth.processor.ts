import { Process, Processor } from '@nestjs/bull';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import { Connection, Model } from 'mongoose';

import { OauthLogs } from '../../models/oauth-logs.model';

@Processor('logging')
export class LogOauthProcessor {
  private connection: Connection;
  private oauthLogModel: Model<OauthLogs>;

  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(OauthLogs.name) oauthLogModel: Model<OauthLogs>,
  ) {
    this.connection = connection;
    this.oauthLogModel = oauthLogModel;
  }

  @Process('log-oauth-request')
  async handleLogOauthRequest(job: Job): Promise<void> {
    const transactionSession = await this.connection.startSession();
    await transactionSession.startTransaction();

    try {
      const req: { url: string; ip: string; headers: any; body: any } =
        job.data;
      const log: OauthLogs = new OauthLogs(
        'request',
        req.url,
        req.ip,
        req.headers,
        req.body,
      );

      new this.oauthLogModel(log).save();
    } catch (e) {
      await transactionSession.commitTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }

  @Process('log-oauth-response')
  async handleLogOauthResponse(job: Job): Promise<void> {
    const transactionSession = await this.connection.startSession();
    transactionSession.startTransaction();

    try {
      const res: { url: string; headers: any; body: any } = job.data;
      const log: OauthLogs = new OauthLogs(
        'response',
        null,
        res.url,
        res.headers,
        res.body,
      );

      new this.oauthLogModel(log).save();
    } catch (e) {
      await transactionSession.commitTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }
}
