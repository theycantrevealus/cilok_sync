import { DataSync, DataSyncDocument } from '@data_sync/models/data.sync.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import mongoose, { Model } from 'mongoose';

import {
  AccountLocation,
  AccountLocationDocument,
} from '@/account/models/account.location.model';
import { Account, AccountDocument } from '@/account/models/account.model';
import { Role, RoleDocument } from '@/account/models/role.model';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import {
  LocationHris,
  LocationHrisDocument,
} from '@/location/models/location.hris.model';
import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { PIC, PICDocument } from '@/pic/models/pic.model';

import { DataSyncLogService } from './log.service';

@Injectable()
export class RoleSyncService {
  constructor(
    private readonly dataSyncLogService: DataSyncLogService,

    private readonly applicationService: ApplicationService,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,
  ) {}

  /**
   * Version 2
   *
   * @param payload
   * @returns
   */
  async syncData(payload) {
    const start = new Date();

    let result = false;

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} start role sync with event '${payload.event}'`,
      start,
    );

    switch (payload.event) {
      case 'create':
        result = await this.syncDataCreate(payload);
        break;

      case 'update':
        result = await this.syncDataCreate(payload);
        break;

      case 'delete':
        result = await this.syncDataDelete(payload);
        break;

      default:
        await this.dataSyncLogService.error(
          payload,
          start,
          `Event '${payload.event}' not found!`,
        );
    }

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} FINISH !! (status = ${result})`,
      start,
    );

    return result;
  }

  private async syncDataDelete(payload) {
    const start = new Date();

    const role = await this.roleModel.findOne({
      role_id: payload.identifier,
    });
    if (!role) {
      await this.dataSyncLogService.error(
        payload,
        start,
        `${payload.identifier} does not exist!`,
      );
      return false;
    }

    await role.delete();

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} deleted !`,
      start,
    );

    return true;
  }

  private async syncDataCreate(payload) {
    const start = new Date();
    const coreData = payload?.additional;

    await this.roleModel
      .findOneAndUpdate(
        {
          role_id: payload.identifier,
        },
        {
          role_id: payload.identifier,
          name: coreData?.name,
          desc: coreData?.desc,
          authorizes: coreData?.authorizes ?? [],
          // permissions: coreData?.permissions ?? [], // TODO
          status: coreData?.status,
        },
        { upsert: true, new: true },
      )
      .then(async (role) => {
        await this.dataSyncLogService.verbose(
          payload,
          {
            role: role,
          },
          `${payload.identifier} role ${payload.event}`,
          start,
        );
      })
      .catch(async (e) => {
        await this.dataSyncLogService.error(payload, start, e?.message);
        return false;
      });

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} ${payload.event} !`,
      start,
    );

    return true;
  }
}
