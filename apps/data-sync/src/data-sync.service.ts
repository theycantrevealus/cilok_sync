import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { DataSync, DataSyncDocument } from './models/data.sync.model';
import { AccountSyncService } from './services/accounts.sync.service';
import { DataSyncLogService } from './services/log.service';
import { RoleSyncService } from './services/roles.sync.service';

@Injectable()
export class DataSyncService {
  constructor(
    private readonly dataSyncLogService: DataSyncLogService,

    private readonly accountSyncService: AccountSyncService,
    private readonly roleSyncService: RoleSyncService,

    @InjectModel(DataSync.name)
    private dataSyncModel: Model<DataSyncDocument>,
  ) {}

  async actDataSync(payload: any) {
    const start = new Date();
    let result = null;

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `Init sync '${payload?.target}' service`,
      start,
    );

    try {
      switch (payload.target) {
        case 'accounts':
          result = await this.accountSyncService.syncDataV2(payload);
          break;

        case 'roles':
          result = await this.roleSyncService.syncData(payload);
          break;

        default:
          // not found
          break;
      }

      if (result) {
        await this.dataSyncLogService.verbose(
          payload,
          {},
          `Finish sync '${payload?.target}' with id ${payload.log_id}`,
          start,
        );

        await this.dataSyncModel.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(payload.log_id),
          },
          {
            sync_at: new Date(),
          },
        );
      }
    } catch (err) {
      await this.dataSyncLogService.error(
        payload,
        start,
        `Service error ${err?.message}`,
        err?.trace,
      );
    }

    return true;
  }
}
