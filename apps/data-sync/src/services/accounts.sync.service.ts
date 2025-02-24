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
export class AccountSyncService {
  constructor(
    private readonly dataSyncLogService: DataSyncLogService,

    private readonly applicationService: ApplicationService,

    @InjectModel(DataSync.name)
    private dataSyncModel: Model<DataSyncDocument>,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    @InjectModel(AccountLocation.name)
    private accountLocationModel: Model<AccountLocationDocument>,

    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,

    @InjectModel(LocationHris.name)
    private locationHrisModel: Model<LocationHrisDocument>,

    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(PIC.name)
    private picModel: Model<PICDocument>,
  ) {}

  /**
   * Version 2
   *
   * @param payload
   * @returns
   */
  async syncDataV2(payload) {
    const start = new Date();

    let result = false;

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} start account sync with event '${payload.event}'`,
      start,
    );

    switch (payload.event) {
      case 'create':
        result = await this.syncDataV2Create(payload);
        break;

      case 'update':
        result = await this.syncDataV2Create(payload);
        break;

      case 'delete':
        result = await this.syncDataV2Delete(payload);
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

  private async syncDataV2Delete(payload) {
    const start = new Date();

    const accounts = await this.accountModel.findOne({
      user_id: payload.identifier,
    });
    if (!accounts) {
      await this.dataSyncLogService.error(
        payload,
        start,
        `${payload.identifier} does not exist!`,
      );
      return false;
    }

    await accounts.delete();

    await this.dataSyncLogService.verbose(
      payload,
      {},
      `${payload.identifier} deleted !`,
      start,
    );
    return true;
  }

  private async checkIsValidObjectId(str) {
    try {
      const check = new ObjectId(str);
      if (check?.toString() == str) {
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  private async syncDataV2Create(payload) {
    const start = new Date();
    const coreData = payload?.additional;

    let roleFromCore: any = null;
    if (coreData.role_id) {
      roleFromCore = await this.roleModel.findOne({
        role_id: coreData.role_id,
      });

      if (roleFromCore) {
        await this.dataSyncLogService.verbose(
          payload,
          {
            roleFromCore: roleFromCore,
          },
          `${coreData.role_id} role exist`,
          start,
        );
        roleFromCore = roleFromCore._id;
      } else {
        await this.dataSyncLogService.error(
          payload,
          start,
          `${coreData.role_id} role does not exist`,
        );
        roleFromCore = null;

        // get default role_non_manager
        const defaultRoleNonManager = await this.systemConfigModel.findOne({
          param_key: 'DEFAULT_ROLE_NON_MANAGER',
        });

        if (!defaultRoleNonManager) {
          await this.dataSyncLogService.error(
            payload,
            start,
            `${payload.identifier} DEFAULT_ROLE_NON_MANAGER not set!`,
          );
        } else {
          roleFromCore = new ObjectId(
            defaultRoleNonManager.param_value.toString(),
          );
        }
      }
    } else {
      // skip kalau core tidak membawa role_id
    }

    // crate current user
    await this.accountModel
      .findOneAndUpdate(
        {
          user_id: payload.identifier,
        },
        {
          user_id: payload.identifier,
          type: 'business',
          user_name: coreData?.username,
          first_name: coreData?.firstname,
          last_name: coreData?.lastname,
          phone: coreData?.phone,
          email: coreData?.email,
          birthdate: coreData?.birthdate,
          job_level: coreData?.job_level,
          job_title: coreData?.job_title,
          status: coreData?.status,
          manager_id: coreData?.manager_id,

          role: roleFromCore ?? undefined, // local role id
          core_role: coreData?.role_id,

          line_id: coreData?.line_id,

          agent: coreData?.agent,
          legacy_user_id: coreData?.legacy_user_id,
        },
        { upsert: true, new: true },
      )
      .then(async (account) => {
        await this.dataSyncLogService.verbose(
          payload,
          {
            account: account,
          },
          `${payload.identifier} account ${payload.event}`,
          start,
        );

        // PIC
        const configName = 'DS_CREATE_PIC';
        const picConfig = await this.applicationService.checkConfig(configName);
        if (picConfig) {
          await this.createPicData(payload, account);
        } else {
          await this.dataSyncLogService.error(
            payload,
            start,
            `-> Configuration for ${configName} is disabled, for Activated you can add on SystemConfig = { param_key : '${configName}', param_value : true } !`,
          );
        }

        // find all users who use this accunt as a manager
        const localManager = await this.accountModel.find({
          $or: [
            { manager_id: account.user_id },
            { manager_id: account.user_name },
          ],
        });

        await this.dataSyncLogService.verbose(
          payload,
          {
            localManager: localManager,
          },
          `${payload.identifier} account ${
            localManager?.length > 0 ? 'is manager' : 'is not manager'
          }`,
          start,
        );

        // current user is manager?
        if (localManager?.length > 0) {
          await this.updateManagerUserRole(payload, account);
        }

        // get location
        if (coreData?.location) {
          const localDataSource = ['BOTH', 'Telkomsel'];

          // get location mapping for SIAD/HRIS first
          let locationMap = await this.locationHrisModel.findOne({
            name: coreData.location,
          });

          if (locationMap) {
            await this.dataSyncLogService.verbose(
              payload,
              {
                location: locationMap,
              },
              `${payload.identifier} with location map (SIAD/HRIS) found!`,
              start,
            );
          } else {
            await this.dataSyncLogService.error(
              payload,
              start,
              `${payload.identifier} with location map (SIAD/HRIS) '${coreData.location}' not found`,
            );

            const validObjId = await this.checkIsValidObjectId(
              coreData.location,
            );

            await this.dataSyncLogService.verbose(
              payload,
              {},
              `${payload.identifier} is location payload (${coreData.location}) is valid object id? ${validObjId}`,
              start,
            );

            if (validObjId) {
              locationMap = await this.locationModel.findById(
                coreData.location,
              );
            } else {
              locationMap = await this.locationModel.findOne({
                data_source: {
                  $in: localDataSource,
                },
                name: coreData.location.toUpperCase(),
              });
            }

            if (locationMap) {
              await this.dataSyncLogService.verbose(
                payload,
                {
                  location: locationMap,
                },
                `${payload.identifier} with location map (BOTH/Telkomsel) found!`,
                start,
              );
            } else {
              await this.dataSyncLogService.error(
                payload,
                start,
                `${payload.identifier} with location map (BOTH/Telkomsel) '${coreData.location}' not found`,
              );
            }
          }

          // location exist
          if (locationMap) {
            // get location id
            let locationId = null;
            if (localDataSource.includes(locationMap.data_source)) {
              locationId = locationMap._id;
            } else {
              locationId = locationMap.location;
            }

            // find local location data
            await this.locationModel
              .findById(locationId)
              .then(async (location) => {
                if (location) {
                  await this.dataSyncLogService.verbose(
                    payload,
                    {
                      location: location,
                    },
                    `${payload.identifier} local location found!`,
                    start,
                  );
                } else {
                  await this.dataSyncLogService.error(
                    payload,
                    start,
                    `${payload.identifier} local location not found!`,
                  );
                }

                // account location
                await this.accountLocationModel.findOneAndUpdate(
                  {
                    account: account._id,
                  },
                  {
                    account: account._id,
                    location: new mongoose.Types.ObjectId(location._id),
                    agent: account.agent,
                  },
                  { upsert: true },
                );

                // location type
                await this.lovModel
                  .findById(location.type.toString())
                  .then(async (systemConfig) => {
                    if (systemConfig) {
                      await this.dataSyncLogService.verbose(
                        payload,
                        {
                          locationType: systemConfig,
                        },
                        `${payload.identifier} location type found`,
                        start,
                      );
                    } else {
                      await this.dataSyncLogService.error(
                        payload,
                        start,
                        `${payload.identifier} location type not found`,
                      );
                    }

                    const defaultManagerHq =
                      await this.systemConfigModel.findOne({
                        param_key: 'DEFAULT_MANAGER_HQ',
                      });

                    // always update superior_hq
                    if (defaultManagerHq) {
                      await this.accountModel.updateOne(
                        { _id: account._id },
                        {
                          superior_hq: defaultManagerHq.param_value.toString(),
                        },
                      );
                    } else {
                      await this.dataSyncLogService.error(
                        payload,
                        start,
                        `${payload.identifier} DEFAULT_MANAGER_HQ not set!`,
                      );
                    }

                    // update manager
                    if (coreData?.manager_id) {
                      if (coreData.manager_id == 'none') {
                        await this.accountModel.updateOne(
                          { _id: account._id },
                          {
                            manager_id: '',
                            superior_local: '',
                          },
                        );
                      } else {
                        const managerUser = await this.accountModel.findOne({
                          $or: [
                            { user_id: coreData.manager_id },
                            { user_name: coreData.manager_id },
                          ],
                        });

                        if (managerUser) {
                          if (systemConfig.set_value === 'Head Quarter (HQ)') {
                            await this.accountModel.updateOne(
                              { _id: account._id },
                              {
                                superior_hq: managerUser?._id?.toString(),
                              },
                            );
                          } else {
                            await this.accountModel.updateOne(
                              { _id: account._id },
                              {
                                superior_local: managerUser?._id?.toString(),
                              },
                            );
                          }

                          // update manager user role
                          await this.updateManagerUserRole(
                            payload,
                            managerUser,
                          );
                        } else {
                          await this.dataSyncLogService.error(
                            payload,
                            start,
                            `${payload.identifier} manager '${coreData.manager_id}' not found!`,
                          );
                        }
                      }
                    }

                    // update all user with current user as manager_id
                    await this.updateManager(localManager, account.user_name);
                  })
                  .catch(async (e) => {
                    await this.dataSyncLogService.error(
                      payload,
                      start,
                      e?.message,
                    );
                    return false;
                  });
              })
              .catch(async (e) => {
                await this.dataSyncLogService.error(payload, start, e?.message);
                return false;
              });
          } else {
            await this.dataSyncLogService.error(
              payload,
              start,
              `${payload.identifier} with all location map '${coreData.location}' not found`,
            );
          }
        }
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

  private async updateManagerUserRole(payload, account) {
    const start = new Date();

    // check role, is default role manager
    const defaultApproval = await this.systemConfigModel.findOne({
      param_key: 'DEFAULT_ROLE_MANAGER',
    });

    await this.dataSyncLogService.verbose(
      payload,
      {
        account: account,
        defaultApproval: defaultApproval,
      },
      `-> '${account._id.toString()}' (${
        account.user_name
      }) comparing ${account?.role?.toString()} with ${defaultApproval?.param_value?.toString()}`,
      start,
    );

    // this user role is manager
    if (
      account?.role?.toString() === defaultApproval?.param_value?.toString()
    ) {
      // SKIPPP
      await this.dataSyncLogService.verbose(
        payload,
        {},
        `-> '${account._id.toString()}' (${
          account.user_name
        }) role is already as manager`,
        start,
      );
    } else {
      // update current user role to manager
      await this.accountModel.updateOne(
        { _id: account._id },
        {
          role: new mongoose.Types.ObjectId(
            defaultApproval?.param_value?.toString(),
          ),
        },
      );

      await this.dataSyncLogService.verbose(
        payload,
        {},
        `-> '${account._id.toString()}' (${
          account.user_name
        }) role has updated to manager role`,
        start,
      );
    }
  }

  private async updateManager(users, manager_username) {
    const start = new Date();

    const managerUser = await this.accountModel.findOne({
      $or: [{ user_id: manager_username }, { user_name: manager_username }],
    });

    return await Promise.all(
      users.map(async (user) => {
        await this.dataSyncLogService.verbose(
          users,
          {
            user: user,
            manager_username: manager_username,
          },
          `-> Updating '${user._id}' (${user.user_name}) manager to '${managerUser._id}' (${managerUser.user_name})`,
          start,
        );

        const userLoc = await this.accountLocationModel.findOne({
          account: user._id,
        });

        const loc = await this.locationModel.findById(
          userLoc?.location?.toString(),
        );

        const locType = await this.lovModel.findById(loc.type.toString());

        if (locType.set_value === 'Head Quarter (HQ)') {
          await this.accountModel.updateOne(
            { _id: user._id },
            {
              superior_hq: managerUser?._id?.toString(),
            },
          );
        } else {
          await this.accountModel.updateOne(
            { _id: user._id },
            {
              superior_local: managerUser?._id?.toString(),
            },
          );
        }
      }),
    );
  }

  private async createPicData(payload, user) {
    const start = new Date();

    try {
      const phone = user.phone.split('|');
      const msisdn = formatMsisdnToID(phone[0]);

      const data = await this.picModel.findOneAndUpdate(
        {
          msisdn: msisdn,
        },
        {
          name: `${user.first_name} ${user.last_name}`,
          msisdn: msisdn,
          email: `${user.email}`,
        },
        { upsert: true, new: true },
      );

      if (data) {
        await this.dataSyncLogService.verbose(
          payload,
          {
            user: user,
            pid: data,
          },
          `-> Creating PIC data for '${user._id}' (${user.user_name}).`,
          start,
        );

        return true;
      } else {
        await this.dataSyncLogService.error(
          payload,
          start,
          `-> Unable to create PIC for '${user._id}' (${user.user_name})`,
        );

        return false;
      }
    } catch (err) {
      await this.dataSyncLogService.error(
        payload,
        start,
        `-> Unable to create PIC for '${user._id}' (${user.user_name}) with error: ${err?.message}`,
      );

      return false;
    }
  }
}
