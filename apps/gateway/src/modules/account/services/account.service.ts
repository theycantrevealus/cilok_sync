import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  CACHE_MANAGER,
  CacheStore,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { AxiosResponse } from 'axios';
import mongoose, { Model, Types } from 'mongoose';
import { catchError, lastValueFrom, map, Observable, throwError } from 'rxjs';

import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { Channel } from '@/channel/models/channel.model';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalErrorResponse, GlobalResponse } from '@/dtos/response.dto';

import { AccountAddDTO, AccountAddDTOResponse } from '../dto/account.add.dto';
import {
  AccountAssignDTO,
  AccountAssignDTOResponse,
} from '../dto/account.assign.dto';
import { AccountDeleteDTOResponse } from '../dto/account.delete.dto';
import {
  AccountEditDTO,
  AccountEditDTOResponse,
} from '../dto/account.edit.dto';
import { RoleAddDTO } from '../dto/account.role.add.dto';
import { RoleDeleteDTOResponse } from '../dto/account.role.delete.dto';
import { RoleEditDTO } from '../dto/account.role.edit';
import {
  AccountCredentialLog,
  AccountCredentialLogDocument,
} from '../models/account.creadential.log.model';
import {
  AccountLocation,
  AccountLocationDocument,
} from '../models/account.location.model';
import { Account, AccountDocument } from '../models/account.model';
import {
  Authorization,
  AuthorizationDocument,
} from '../models/authorization.model';
import { Role, RoleDocument } from '../models/role.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { ProgramV2, ProgramV2Document } from '@/program/models/program.model.v2';

@Injectable()
export class AccountService {
  private url: string;
  private raw_core: string;
  private raw_port: number;
  private realm: string;
  private merchant: string;
  private branch: string;
  private logger = new Logger('HTTP');
  private http;

  constructor(
    @InjectModel(Authorization.name)
    private authorizationModel: Model<AuthorizationDocument>,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(Role.name)
    private accountRoleModel: Model<RoleDocument>,

    @InjectModel(AccountLocation.name)
    private accountLocationModel: Model<AccountLocationDocument>,

    @InjectModel(AccountCredentialLog.name)
    private accountCredentialLog: Model<AccountCredentialLogDocument>,
    
    @InjectModel(Keyword.name) 
    private keywordModel: Model<KeywordDocument>,

    @InjectModel(ProgramV2.name) 
    private programModel: Model<ProgramV2Document>,

    private readonly httpService: HttpService,
    configService: ConfigService,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @InjectModel(SystemConfig.name)
    private systemConfig: Model<SystemConfigDocument>,
  ) {
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.http =
      configService.get<string>('core-backend.api.mode') === 'https'
        ? require('https')
        : require('http');
  }

  async getRoleMap(param: any): Promise<any> {
    const role = await this.authorizationModel
      .findOne({ url: param })
      .select('role -_id');
    if (role) {
      return role.role;
    }
    return false;
  }

  async all_old(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set = param.sort === '{}' ? { _id: 1 } : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.accountModel.aggregate(
      [
        {
          $lookup: {
            from: 'roles',
            let: { role_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$role_id'] }],
                  },
                },
              },
              {
                $project: {
                  _id: false,
                  keyword: false,
                  bonus_type: false,
                  location: false,
                  bucket: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'keyword_bonus',
          },
        },
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
      ],
      (err, result) => {
        return result;
      },
    );

    return {
      data: data,
      total: data.length,
    };
  }

  async all(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $lookup: {
        from: 'roles',
        let: { role_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$_id', '$$role_id'] }],
              },
            },
          },
          {
            $project: {
              _id: false,
              keyword: false,
              bonus_type: false,
              location: false,
              bucket: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'keyword_bonus',
      },
    });

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.accountModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const data = await this.accountModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async detail(param: string): Promise<any> {
    const data = await this.accountModel.aggregate(
      [
        {
          $lookup: {
            from: 'roles',
            let: { role_id: '$role' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$role_id'] }],
                  },
                },
              },
              {
                $project: {
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'role_detail',
          },
        },
        {
          $unwind: '$role_detail',
        },
        {
          $lookup: {
            from: 'accountlocations',
            let: { account: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$account', '$$account'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'locations',
                  let: { location: '$location' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$location'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: false,
                      },
                    },
                  ],
                  as: 'location_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  account: false,
                },
              },
              {
                $unwind: '$location_detail',
              },
            ],
            as: 'account_location',
          },
        },
        {
          $unwind: '$account_location',
        },
        {
          $match: {
            $and: [
              { _id: new mongoose.Types.ObjectId(param) },
              { deleted_at: null },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  async getSystemConfig(parameter: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.SYSTEMCONFIG_KEY}-${parameter}`;
    const redisSystemConfig: any = await this.cacheManager.get(key);

    if (redisSystemConfig) {
      console.log(
        `REDIS|Load systemconfig ${parameter} from Redis|${Date.now() - now}`,
      );

      return redisSystemConfig?.param_value;
    } else {
      const data = await this.systemConfig.findOne({
        param_key: parameter,
      });

      console.log(
        `REDIS|Load systemconfig ${parameter} from Database|${
          Date.now() - now
        }`,
      );

      if (data) {
        await this.cacheManager.set(key, data);
      }

      return data?.param_value;
    }
  }

  async getAccountByUsername(username: string = null): Promise<any> {
    const now = Date.now();
    let result = null;

    try {
      const role_access = await this.getSystemConfig(
        'ROLE_ACCESS_BE_USERS_REDIS',
      );

      const open_access = role_access.filter((user) => user == username);

      console.log(
        'X_CHECK_ROLE_ACCESS : ',
        open_access.length > 0
          ? `BE (${open_access.join(',')})`
          : `FE (${username})`,
      );

      if (username && open_access.length > 0) {
        const key = `${RedisDataKey.ACCOUNTS}-${username.toString()}`;
        console.log('X_REDIS_ACCOUNT_KEY : ', key);

        const accountRedis = await this.cacheManager.get(key);
        console.log('X_REDIS_ACCOUNT_VALUE : ', JSON.stringify(accountRedis));

        if (accountRedis) {
          console.log(
            `REDIS|Load account ${username} from Redis|${Date.now() - now}`,
          );

          result = accountRedis;
        } else {
          const data = await this.getAccountByParams({ user_name: username });

          console.log(
            `REDIS|Load account ${username} from Database|${Date.now() - now}`,
          );

          if (data) {
            await this.cacheManager.set(key, data[0], { ttl: 24 * 60 * 60 }); //24 hours
            result = data[0];
          }
        }

        return result;
      } else {
        // get data without redis
        const data = await this.getAccountByParams({ user_name: username });
        result = data ? data[0] || null : null;
        return result;
      }
    } catch (error) {
      console.log('X_CATCH_getAccountByUsername : ', JSON.stringify(error));

      // get data without redis
      const data = await this.getAccountByParams({ user_name: username });
      result = data ? data[0] || null : null;
      return result;
    }
  }

  async getAccountByParams(params: any): Promise<any> {
    const data = await this.accountModel.aggregate(
      [
        {
          $lookup: {
            from: 'roles',
            let: { role_id: '$role' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$role_id'] }],
                  },
                },
              },
              {
                $project: {
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'role_detail',
          },
        },
        {
          $unwind: '$role_detail',
        },
        {
          $lookup: {
            from: 'accountlocations',
            let: { account: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$account', '$$account'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'locations',
                  let: { location: '$location' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$location'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        _id: false,
                      },
                    },
                  ],
                  as: 'location_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  account: false,
                },
              },
              {
                $unwind: '$location_detail',
              },
            ],
            as: 'account_location',
          },
        },
        {
          $unwind: '$account_location',
        },
        {
          $match: {
            $and: [params, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data ?? null;
  }

  async find_by(param: any): Promise<any> {
    let result = null;

    switch (true) {
      case !!param?.user_name:
        result = await this.getAccountByUsername(param?.user_name);
        break;
      default:
        const data = this.getAccountByParams(param);
        result = data ? data[0] || null : null;
        break;
    }

    return result;
  }

  async add(
    accountData: AccountAddDTO,
    parameter: any,
  ): Promise<AccountAddDTOResponse> {
    const accountResponse = new AccountAddDTOResponse();
    return await lastValueFrom(
      this.httpService
        .post(this.url, accountData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: parameter.token,
          },
        })
        .pipe(
          map(async (response) => {
            const data = response.data;
            if (data.code.equals('S00000')) {
              const newAccount = new this.accountModel(accountData);
              const proceedData = await newAccount
                .save()
                .then(async (returning) => {
                  const location = new this.accountLocationModel({
                    account: returning,
                    location: accountData.location,
                  });
                  await location.save();
                  return returning;
                });
              if (proceedData) {
                accountResponse.message = 'Account Created Successfully';
                accountResponse.status = HttpStatus.OK;
                accountResponse.payload = newAccount;
              } else {
                accountResponse.message = 'Account Failed to Created';
                accountResponse.status = 400;
                accountResponse.payload = accountData;
              }
            } else {
              accountResponse.message = 'Account Failed to Created';
              accountResponse.status = 400;
              accountResponse.payload = accountData;
            }
            return accountResponse;
          }),
          catchError(async (err: any) => {
            // throwError(
            //   () => new HttpException(err.response.data, err.response.status),
            // );
            accountResponse.message = 'Account Failed to Created';
            accountResponse.status = 400;
            accountResponse.payload = err;
            console.log(accountResponse);
            return accountResponse;
          }),
        ),
    );
  }

  async edit(
    data: AccountEditDTO,
    param: string,
  ): Promise<AccountEditDTOResponse> {
    const process = await this.accountModel
      .findOneAndUpdate(
        { _id: param },
        {
          ...data,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new AccountEditDTOResponse();
    if (process) {
      const checkLocation = await this.accountLocationModel
        .findOne({ account: param })
        .exec();
      if (!checkLocation) {
        await this.accountLocationModel.findOneAndUpdate(
          { account: param },
          { location: data.location },
        );
      } else {
        const location = new this.accountLocationModel({
          account: param,
          location: data.location,
        });
        await location.save();
      }

      response.message = 'Account Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Account Failed to Updated';
      response.status = 400;
      response.payload = data;
    }
    return response;
  }

  async delete(param: string): Promise<AccountDeleteDTOResponse> {
    return await this.accountModel.findOneAndUpdate(
      {
        $and: [{ _id: param }, { deleted_at: null }],
      },
      { deleted_at: Date.now() },
    );
  }

  async findByUsername(parameter: string) {
    return await this.accountModel
      .findOne({
        user_name: parameter,
      })
      .exec();
  }

  async identifyBusiness(
    param: any,
    channel: Channel = null,
  ): Promise<Account> {
    return await new Promise(async (resolve, reject) => {
      const credentialCheck: any = await this.accountCredentialLog
        .findOne({ $and: [{ token: param.auth }, { channel: channel }] })
        .exec();

      if (credentialCheck) {
        await this.detail(credentialCheck.account)
          .then(async (data: Account) => {
            resolve(data);
          })
          .catch((e) => {
            reject({
              code: 403,
              error: e,
            });
          });
      } else {
        try {
          await this.authenticateBusiness({
            auth: param.auth,
            channel: channel,
          })
            .then(async (data: Account) => {
              resolve(data);
            })
            .catch((e) => {
              reject({
                code: 403,
                error: e,
              });
            });
        } catch (e) {
          reject({
            code: 403,
            error: e,
          });
        }
      }
    });
  }

  async identifyMerchant(param: any, channel: Channel): Promise<Account> {
    const credentialCheck: any = await this.accountCredentialLog
      .findOne({ $and: [{ token: param.auth }, { channel: channel }] })
      .exec();

    if (credentialCheck) {
      return await this.detail(credentialCheck.account);
    } else {
      return await this.authenticateMerchant({
        auth: `Bearer ${param.auth}`,
        channel: channel,
      })
        .then(async (data: any) => {
          if (data.username && data.username !== null) {
            const dataRaw = await this.find_by({
              user_name: data.username,
            }).then((ab) => {
              return ab;
            });

            await new this.accountLocationModel({
              account: dataRaw._id,
              location: new mongoose.Types.ObjectId('62ffd9ed1e38fbdeb16f1f53'),
            }).save();

            return await this.detail(dataRaw._id);
          } else {
            // throw new Error(data);
            console.log(data);
          }
        })
        .catch((e: Error) => {
          console.log(e);
          // throw new Error(e.message);
        });
    }
  }

  // async identifyMerchant(param: any, channel: Channel): Promise<Account> {
  //   const credentialCheck: any = await this.accountCredentialLog
  //     .findOne({ $and: [{ token: param.auth }, { channel: channel }] })
  //     .exec();
  //
  //   if (credentialCheck) {
  //     return await this.detail(credentialCheck.account);
  //   } else {
  //     return await this.authenticateMerchant({
  //       auth: `Bearer ${param.auth}`,
  //       channel: channel,
  //     })
  //       .then(async (data: any) => {
  //         if (data.username && data.username !== null) {
  //           const dataRaw = await this.find_by({
  //             user_name: data.username,
  //           }).then((ab) => {
  //             return ab;
  //           });
  //
  //           await new this.accountLocationModel({
  //             account: dataRaw._id,
  //             location: new mongoose.Types.ObjectId('62ffd9ed1e38fbdeb16f1f53'),
  //           }).save();
  //
  //           return await this.detail(dataRaw._id);
  //         } else {
  //           throw new Error(data);
  //         }
  //       })
  //       .catch((e: Error) => {
  //         throw new Error(e.message);
  //       });
  //   }
  // }
  //

  async authenticateMerchant(
    param: any,
  ): Promise<Observable<AxiosResponse<any, any>>> {
    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/merchants/home`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: param.auth,
          },
        })
        .pipe(
          map(async (response) => {
            const dataProfileParse = response.data.payload.user_profile;
            let check = await this.findByUsername(dataProfileParse.username);
            if (!check) {
              let checkRole = await this.accountRoleModel
                .findOne({ role_id: dataProfileParse.role_id })
                .exec();
              if (!checkRole) {
                await lastValueFrom(
                  this.httpService
                    .get(
                      `${this.url}/merchant-roles/${dataProfileParse.role_id}`,
                      {
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: param.auth,
                        },
                      },
                    )
                    .pipe(
                      map(async (roleCore) => {
                        await new this.accountRoleModel({
                          role_id: dataProfileParse.role_id,
                          name: roleCore.data.payload.role.name,
                          desc: roleCore.data.payload.role.desc,
                        }).save();
                      }),
                    ),
                );

                checkRole = await this.accountRoleModel
                  .findOne({ role_id: dataProfileParse.role_id })
                  .exec();
              }

              check = new this.accountModel({
                user_id: dataProfileParse.id,
                user_name: dataProfileParse.username,
                first_name: dataProfileParse.firstname,
                last_name: dataProfileParse.lastname,
                job_title: dataProfileParse.job_title,
                job_level: dataProfileParse.job_level,
                phone: dataProfileParse.phone,
                email: dataProfileParse.email,
                type: 'merchant',
                birthdate: dataProfileParse.birthdate,
                role: checkRole,
              });
              await check.save();
              response.data.payload.user_profile = {
                ...response.data.payload.user_profile,
                ...check,
              };
              return response.data.payload.user_profile;
            } else {
              const account = await this.find_by({
                user_name: dataProfileParse.username,
              });
              response.data.payload.user_profile = {
                ...response.data.payload.user_profile,
                ...account,
              };
              return response.data.payload.user_profile;
            }
          }),
          catchError(async (err: any) => {
            return err;
          }),
        ),
    );
  }

  async core_role_find(
    param: any,
  ): Promise<Observable<AxiosResponse<any, any>>> {
    const _this: any = this;
    return await lastValueFrom(
      this.httpService
        .get(`${_this.url}/roles/${param.id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: param.auth,
          },
        })
        .pipe(
          map(async (response) => {
            return response.data.payload.role;
          }),
          catchError(async (err: any) => {
            // console.clear();
            console.log(`${_this.url}/roles/${param.id}`);
            console.log(err.message);
            return err;
          }),
        ),
    );
  }

  // async core_role_find(param: any) {
  //   const _this: any = this;
  //   return new Promise((resolve, reject) => {
  //     const options = {
  //       method: 'GET',
  //       hostname: this.raw_core,
  //       port: this.raw_port > 0 ? this.raw_port : null,
  //       path: `/gateway/v3.0/roles/${param.id}`,
  //       headers: {riggered
  //         Authorization: param.auth,
  //         'Content-Type': 'application/json',
  //       },
  //     };
  //
  //     const req = _this.http.request(options, function (res) {
  //       const chunks = [];
  //
  //       res.on('data', function (chunk) {
  //         chunks.push(chunk);
  //       });
  //
  //       res.on('end', async () => {
  //         if (chunks) {
  //           const body = Buffer.concat(chunks);
  //           console.log(body);
  //           const response = JSON.parse(body.toString());
  //           const parsedResponse = response.payload.role;
  //           resolve(parsedResponse);
  //         } else {
  //           reject('No response from core');
  //         }
  //       });
  //
  //       res.on('error', function (chunk) {
  //         reject(chunk);
  //       });
  //     });
  //
  //     req.end();
  //   });
  // }

  async authenticateBusiness(param: any): Promise<Account> {
    const _this: any = this;
    return new Promise((resolve, reject) => {
      if (param && param.auth) {
        const options = {
          method: 'GET',
          hostname: this.raw_core,
          port: this.raw_port > 0 ? this.raw_port : null,
          path: '/gateway/v3.0/business/home',
          headers: {
            Authorization: `${param.auth}`,
            'Content-Type': 'application/json',
          },
        };

        const req = _this.http.request(options, function (res) {
          const resCode = res.statusCode;
          const chunks = [];

          res.on('data', function (chunk) {
            chunks.push(chunk);
          });

          res.on('end', async () => {
            if (chunks) {
              const body = Buffer.concat(chunks);
              try {
                const response = JSON.parse(body.toString());
                if (
                  response?.code ==
                  HttpCodeTransaction.ERR_ACCESS_TOKEN_NOT_FOUND_OR_EXPIRED_401
                ) {
                  reject([{ isTokenNotFoundOrExpired: response?.message }]);
                  return;
                } else if (
                  response?.code ==
                  HttpCodeTransaction.ERR_ACCESS_TOKEN_MISSING_403
                ) {
                  reject([{ isTokenMissing: response?.message }]);
                  return;
                } else if (
                  response?.code ==
                  HttpCodeTransaction.ERR_GRANT_TYPE_INVALID_403
                ) {
                  reject([{ isGrantTypeInvalid: response?.message }]);
                  return;
                } else {
                  if (resCode !== 200) {
                    reject([{ isUnauthorized: 'You are not authorized' }]);
                    return;
                  }
                }

                if (!response?.payload) {
                  reject([{ isUnauthorized: 'You are not authorized' }]);
                  return;
                }

                if (!response?.payload?.user_profile) {
                  reject([{ isUnauthorized: 'You are not authorized' }]);
                  return;
                }

                if (response?.payload) {
                  const userProfile = response.payload?.user_profile;
                  if (!userProfile) {
                    //
                  }

                  const finalForm = await _this.find_by({
                    user_name: userProfile.username,
                  });

                  resolve({
                    ...finalForm,
                    core_payload: response.payload,
                  });

                  /*
                  await _this
                    .core_role_find({
                      id: userProfile.role_id,
                      auth: param.auth,
                    })
                    .then(async (roleDetail) => {
                      await _this.accountRoleModel
                        .findOneAndUpdate(
                          { role_id: roleDetail.id },
                          {
                            role_id: roleDetail.id,
                            name: roleDetail.name,
                            desc: roleDetail.desc,
                          },
                          { upsert: true, new: true },
                        )
                        .then(async (role) => {
                          await _this.accountModel
                            .findOneAndUpdate(
                              { user_name: userProfile.username },
                              {
                                user_id: userProfile.id,
                                user_name: userProfile.username,
                                first_name: userProfile.firstname,
                                last_name: userProfile.lastname,
                                job_title: userProfile.job_title,
                                job_level: userProfile.job_level,
                                phone: userProfile.phone,
                                email: userProfile.email,
                                type: 'business',
                                birthdate: userProfile.birthdate,
                                role: role._id,
                                core_role: userProfile.role_id,
                              },
                              { upsert: true, new: true },
                            )
                            .then(async (account) => {
                              await _this.accountLocationModel
                                .findOne({
                                  account: account._id,
                                })
                                .then(async (checkLocation) => {
                                  if (checkLocation === null) {
                                    await _this.accountLocationModel
                                      .findOneAndUpdate(
                                        {
                                          account: account._id,
                                        },
                                        {
                                          account: account._id,
                                          location: new mongoose.Types.ObjectId(
                                            '62ffd9ed1e38fbdeb16f1f53',
                                          ),
                                        },
                                        { upsert: true, new: true },
                                      )
                                      .then(async () => {
                                        const finalForm = await _this.find_by({
                                          user_name: userProfile.username,
                                        });

                                        resolve({
                                          ...finalForm,
                                          core_payload: response.payload,
                                        });
                                      })
                                      .catch((e) => {
                                        reject(e.message);
                                      });
                                  } else {
                                    const finalForm = await _this.find_by({
                                      user_name: userProfile.username,
                                    });

                                    resolve({
                                      ...finalForm,
                                      core_payload: response.payload,
                                    });
                                  }
                                })
                                .catch((e) => {
                                  reject(e.message);
                                });
                            })
                            .catch((e) => {
                              reject(e);
                            });
                        })
                        .catch((e) => {
                          reject(e);
                        });
                    })
                    .catch((e) => {
                      reject(e);
                    });
                    */
                }
              } catch (error) {
                const check_auth = options.headers.Authorization.split(' ');
                if (!check_auth[1]) {
                  reject([
                    {
                      isTokenMissing:
                        HttpMsgTransaction.DESC_ERR_ACCESS_TOKEN_MISSING_403,
                    },
                  ]);
                  return;
                }

                reject([
                  {
                    isUnknown: {
                      message: error.message,
                      stack: error.stack,
                    },
                  },
                ]);
                return;
              }
            } else {
              reject('No response from core');
            }
          });

          res.on('error', function (chunk) {
            reject(chunk);
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      } else {
        reject('No Header');
      }
    });
  }

  async role_all(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort || param.sort !== ''
        ? param.sort !== '{}'
          ? JSON.parse(param.sort)
          : { created_at: -1 }
        : { _id: 1 };
    const skip: number = param.skip ? parseInt(param.skip) : 0;
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.accountRoleModel.aggregate(
      [
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
      ],
      (err, result) => {
        return result;
      },
    );

    return {
      data: data,
      total: data.length,
    };
  }

  // async role_add(data: RoleAddDTO, param: any): Promise<RoleAddDTOResponse> {
  //   const CoreResponse = new RoleAddDTOResponse();
  //   return await lastValueFrom(
  //     this.httpService
  //       .post(
  //         `${this.url}/merchant-roles`,
  //         {
  //           locale: process.env.CORE_BACKEND_LOCALE,
  //           name: data.name,
  //           desc: data.desc,
  //           status: data.status,
  //           realm_id: process.env.CORE_BACKEND_REALM_ID,
  //           branch_id: process.env.CORE_BACKEND_BRANCH_ID,
  //           authorizes: data.authorizes,
  //         },
  //         {
  //           headers: {
  //             'Content-Type': 'application/json',
  //             Authorization: param.auth,
  //           },
  //         },
  //       )
  //       .pipe(
  //         map(async (response) => {
  //           if (response.data.code === 'S00000') {
  //             const process = await new this.accountRoleModel({
  //               ...data,
  //               role_id: response.data.payload.id,
  //             }).save();
  //             if (process) {
  //               CoreResponse.status = HttpStatus.OK;
  //               CoreResponse.message = 'Role created successfully';
  //             } else {
  //               CoreResponse.status = HttpStatus.BAD_REQUEST;
  //               CoreResponse.message = 'Role failed to created';
  //             }
  //           } else {
  //             CoreResponse.status = HttpStatus.BAD_REQUEST;
  //             CoreResponse.message = 'Role failed to created';
  //           }

  //           return CoreResponse;
  //         }),
  //         catchError(async (err: any) => {
  //           throwError(
  //             () => new HttpException(err.response.data, err.response.status),
  //           );
  //           CoreResponse.status = HttpStatus.BAD_REQUEST;
  //           CoreResponse.message = 'Role failed to created';
  //           CoreResponse.payload = err.response.data;
  //           return CoreResponse;
  //         }),
  //       ),
  //   );
  // }

  async role_add(data: RoleAddDTO, param: any) {
    const _this: any = this;
    return new Promise((resolve, reject) => {
      // const CoreResponse = new GlobalResponse();
      const options = {
        method: 'POST',
        hostname: this.raw_core,
        port: null,
        path: '/gateway/v3.0/roles',
        headers: {
          Authorization: param.auth,
          'Content-Type': 'application/json',
        },
      };

      const req = _this.http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });
      });

      req.on('error', function () {
        reject();
      });

      req.write(JSON.stringify(data));

      req.end();
    });
  }

  async role_edit(data: RoleEditDTO, param: any): Promise<GlobalResponse> {
    const CoreResponse = new GlobalResponse();
    return await lastValueFrom(
      this.httpService
        .patch(
          `${this.url}/roles/${param.role_id}`,
          { ...data, merchant_id: this.merchant },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: param.auth,
            },
          },
        )
        .pipe(
          map(async (response) => {
            if (response.data.code === 'S00000') {
              const process = await this.accountRoleModel.findOneAndUpdate(
                { role_id: param.role_id },
                data,
              );
              if (process) {
                CoreResponse.statusCode = HttpStatus.OK;
                CoreResponse.transaction_classify = 'ROLE_EDIT';
                CoreResponse.payload = {
                  ...response.data,
                  trace_id: true,
                };
                CoreResponse.message = 'Role updated successfully';
              } else {
                CoreResponse.statusCode = HttpStatus.BAD_REQUEST;
                CoreResponse.transaction_classify = 'ROLE_EDIT';
                CoreResponse.payload = {
                  ...response.data,
                  trace_id: true,
                };
                CoreResponse.message = 'Role failed to updated';
              }
            } else {
              CoreResponse.statusCode = HttpStatus.BAD_REQUEST;
              CoreResponse.transaction_classify = 'ROLE_EDIT';
              CoreResponse.payload = {
                ...response.data,
                trace_id: true,
              };
              CoreResponse.message = 'Role failed to updated';
            }

            return CoreResponse;
          }),
          catchError(async (error: any) => {
            CoreResponse.statusCode = error;
            CoreResponse.transaction_classify = 'ROLE_EDIT';
            CoreResponse.payload = {
              trace_id: true,
            };
            CoreResponse.message = error;
            return CoreResponse;
          }),
        ),
    );
  }

  async role_delete(data: string, param: any): Promise<RoleDeleteDTOResponse> {
    return await lastValueFrom(
      this.httpService
        .delete(`${this.url}/roles/${data}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: param.auth,
          },
        })
        .pipe(
          map(async (response) => {
            const CoreResponse = new RoleDeleteDTOResponse();
            if (response.status === 204) {
              const process = await this.accountRoleModel.findOneAndDelete({
                role_id: data,
              });
              if (process) {
                CoreResponse.status = HttpStatus.OK;
                CoreResponse.message = 'Role deleted successfully';
              } else {
                CoreResponse.status = HttpStatus.BAD_REQUEST;
                CoreResponse.message = 'Role failed to deleted';
              }
            } else {
              CoreResponse.status = HttpStatus.BAD_REQUEST;
              CoreResponse.message = 'Role failed to deleted';
            }

            return CoreResponse;
          }),
        ),
    );
  }

  async assign_location(
    parameter: AccountAssignDTO,
  ): Promise<AccountAssignDTOResponse> {
    const response = new AccountAssignDTOResponse();
    const process = await this.accountLocationModel.findOneAndUpdate(
      {
        account: new mongoose.Types.ObjectId(parameter.account),
        location: new mongoose.Types.ObjectId(parameter.location),
      },
      {
        account: new mongoose.Types.ObjectId(parameter.account),
        location: new mongoose.Types.ObjectId(parameter.location),
      },
      { upsert: true, new: true },
    );
    if (process) {
      response.message = 'Account assigned successfully';
      response.status = HttpStatus.OK;
      response.payload = parameter;
    } else {
      response.message = 'Account failed to assigned';
      response.status = HttpStatus.BAD_REQUEST;
      response.payload = parameter;
    }

    return response;
  }

  async seed(replace: boolean, exp = true) {
    if (exp) {
      return this.accountModel
        .find()
        .lean()
        .exec()
        .then((e: any) => {
          return e;
        });
    } else {
      // Importing
    }
  }

  async getUserByLocation(param, _id: string): Promise<any> {
    const idLocation = new Types.ObjectId(_id); // Assuming Types is imported from mongoose
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    let name = null;
    const query = [];
    const sort_set = {};

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }
        if (a === 'account.first_name') {
          autoColumn['account.first_name'] = autoColumn[a];
          name = filterSet[a].value
          delete autoColumn[a];
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    query.push({
      $match: {
        $and: [
          {
            location: new mongoose.Types.ObjectId(idLocation),
          },
        ],
      },
    });

    query.push(
      {
        $lookup: {
          from: "accounts",
          localField: "account",
          foreignField: "_id",
          as: "account"
        }
      },
      {
        $unwind: {
          path: "$account",
          preserveNullAndEmptyArrays: false
        }
      }
      );
  
    query.push({
      $project: {
        _id: 0,
        __v: 0,
      }
    });

    if(name !== null){
      query.push({
        $match: {
          "account.first_name": { $regex: new RegExp(name, 'i') }
        }
      });
    }
  
    const allNoFilter = await this.accountLocationModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );
    
    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_hq_id: '$account.superior_hq' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$superior_hq_id',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'account.superior_hq',
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_local_id: '$account.superior_local' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$superior_local_id',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'account.superior_local',
        },
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    const data = await this.accountLocationModel.aggregate(query);

    // console.log('=== QUERY FILTER ===', JSON.stringify(query));
    
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  public async validateChangeLocation(username: string): Promise<any> {
    try {
      const project = { _id: 1 };
      const globlaResponse = new GlobalResponse();
      globlaResponse.statusCode = HttpStatus.OK;
      globlaResponse.transaction_classify = 'VALIDATE_CHANGE_LOCATION';
      globlaResponse.message = 'success';

      // check user is creating program/keyword
      const [keywordCreatingByUser, programCreatingByUser] = await Promise.all([
        this.keywordModel.findOne(
          {
            'created_by.user_name': username,
            'eligibility.name': { $regex: '-EDIT$' },
          },
          project,
        ),
        this.programModel.findOne(
          {
            'created_by.user_name': username,
            name: { $regex: '-EDIT$' },
          },
          project,
        ),
      ]);

      if (keywordCreatingByUser !== null || programCreatingByUser !== null) {
        globlaResponse.payload = {
          is_approver: false,
          is_allowed: false,
        };

        return globlaResponse;
      }

      // check user is created program/keyword
      const [keywordCreatedByUser, programCreatedByUser] = await Promise.all([
        this.keywordModel.findOne(
          {
            'created_by.user_name': username,
            'eligibility.name': { $not: { $regex: '-EDIT-' } },
          },
          project,
        ),
        this.programModel.findOne(
          {
            'created_by.user_name': username,
            name: { $not: { $regex: '-EDIT-' } },
          },
          project,
        ),
      ]);

      if (keywordCreatedByUser !== null || programCreatedByUser !== null) {
        globlaResponse.payload = {
          is_approver: false,
          is_allowed: false,
        };

        return globlaResponse;
      }

      // check user is approving program/keyword
      let [keywordApproval, programApproval] = await Promise.all([
        this.getSystemConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
        this.getSystemConfig('DEFAULT_STATUS_PROGRAM_APPROVE_HQ'),
      ]);

      keywordApproval = new Types.ObjectId(keywordApproval);
      programApproval = new Types.ObjectId(programApproval);

      const fitlerApprovingKeyword = {
        'created_by.manager_id': username,
        'eligibility.name': { $regex: '-EDIT$' }, // hanya -EDIT saya yg dianggap sebagai ongoing, sementara -EDIT-timestamp itu di exclude.
        keyword_approval: { $ne: keywordApproval },
      };

      const filterApprovingProgram = {
        'created_by.manager_id': username,
        name: { $regex: '-EDIT$' }, // hanya -EDIT saya yg dianggap sebagai ongoing, sementara -EDIT-timestamp itu di exclude.
        program_approval: { $ne: programApproval },
      };

      const [approvingKeyword, approvingProgram] = await Promise.all([
        this.keywordModel.findOne(fitlerApprovingKeyword, project),
        this.programModel.findOne(filterApprovingProgram, project),
      ]);
      console.log('KEYWORD', approvingKeyword);
      console.log('PROGRAM', approvingProgram);

      if (approvingKeyword !== null || approvingProgram !== null) {
        globlaResponse.payload = {
          is_approver: true,
          is_allowed: false,
        };

        return globlaResponse;
      }

      // check user is approved program/keyword
      const fitlerApprovedKeyword = {
        'created_by.manager_id': username,
        keyword_approval: { $eq: keywordApproval },
      };

      const filterApprovedProgram = {
        'created_by.manager_id': username,
        program_approval: { $eq: programApproval },
      };

      const [approverKeyword, approverProgram] = await Promise.all([
        this.keywordModel.findOne(fitlerApprovedKeyword, project),
        this.programModel.findOne(filterApprovedProgram, project),
      ]);

      if (approverKeyword !== null || approverProgram !== null) {
        globlaResponse.payload = {
          is_approver: true,
          is_allowed: true,
        };

        return globlaResponse;
      }

      globlaResponse.payload = {
        is_approver: false,
        is_allowed: true,
      };

      return globlaResponse;
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: error.status,
        message: error.message,
        errorCode: 'VALIDATE_CHANGE_LOCATION',
        errorDetails: error, // Optional: Include more details about the error
      });
    }
  }
}
