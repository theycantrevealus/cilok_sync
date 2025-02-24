import { CacheStore } from '@nestjs/cache-manager';
import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { SlRedisService } from '@slredis/slredis.service';
import { ObjectId } from 'bson';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';

import {
  Authorization,
  AuthorizationDocument,
} from '@/account/models/authorization.model';
import {
  KeywordPriority,
  KeywordPriorityDocument,
} from '@/keyword/models/keyword.priority.model';

import { SetConfigDTO, SetConfigDTOResponse } from '../dto/set.config.dto';
import {
  SystemConfig,
  SystemConfigDocument,
} from '../models/system.config.model';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(SystemConfig.name)
    private applicationConfigModel: Model<SystemConfigDocument>,

    @InjectModel(Authorization.name)
    private authorizationModel: Model<AuthorizationDocument>,

    @InjectModel(KeywordPriority.name)
    private keywordPriorityModel: Model<KeywordPriorityDocument>,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @Inject(SlRedisService)
    private slRedisService: SlRedisService,
  ) {
    //
  }

  async repopulateURL(req: any) {
    const router = req.app._router;
    const configGroup = [
      'program',
      'keyword',
      'merchant',
      'lov',
      'bank',
      'bucket',
      'channel',
      'customer',
      'location',
      'outlet',
      'partner',
      'notification',
      'pic',
      'configuration',
      'oauth',
      'account',
      'merchant-outlet',
      'merchant-partner',
      'notification-message',
      'example',
      'campaign',
      'reward-catalogue',
      'remedytools',
      'bid',
      'product',
      'product-category',
      'product-subcategory',
      'cronjob',
    ];
    return {
      routes: router.stack
        .map(async (layer) => {
          if (layer.route) {
            const path = layer.route?.path;
            const method = layer.route?.stack[0].method;
            await this.authorizationModel
              .findOne({
                url: path,
              })
              .then(async (dataSet: any) => {
                let rule = '';
                const testURL = path.split(new RegExp('/v[0-9]/'));
                if (testURL.length > 1) {
                  rule = testURL[1]
                    .replace(new RegExp(/\?.*/, 'gm'), '')
                    .split('/')[0];
                } else {
                  rule = path
                    .replace(new RegExp(/\?.*/, 'gm'), '')
                    .split('/')[1];
                }

                if (dataSet === null) {
                  const newData = new this.authorizationModel({
                    url: path,
                    role:
                      configGroup.indexOf(rule) >= 0
                        ? `business.config.${rule}`
                        : `business.transaction.${rule}`,
                  });
                  await newData.save();
                } else {
                  await this.authorizationModel
                    .findOneAndUpdate(
                      {
                        url: path,
                      },
                      {
                        role:
                          configGroup.indexOf(rule) >= 0
                            ? `business.config.${rule}`
                            : `business.transaction.${rule}`,
                      },
                    )
                    .exec();
                }
              });
            return `${method.toUpperCase()} ${path}`;
          }
        })
        .filter((item) => item !== undefined),
    };
  }

  async loadConfig(): Promise<any> {
    return await this.applicationConfigModel.find().exec();
  }

  async getHello() {
    return 'hello service';
  }

  async setValue(param_key: string, param_value: any): Promise<any> {
    return await this.applicationConfigModel.findOneAndUpdate(
      {
        param_key: param_key,
      },
      {
        param_value: param_value,
      },
    );
  }

  async newConfig(configuration: SetConfigDTO): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse();
    response.transaction_classify = 'CREATE_CONFIGURATION';
    const newConf = new this.applicationConfigModel(configuration);
    await newConf.save();
    if (newConf) {
      response.message = 'Configuration applied successfully';
      response.status = HttpStatus.OK;
      response.payload = configuration;
    } else {
      response.message = 'Configuration failed';
      response.status = HttpStatus.BAD_REQUEST;
      response.payload = configuration;
    }
    return response;
  }

  async editConfig(
    configuration: SetConfigDTO,
    parameter: string,
  ): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse();
    response.transaction_classify = 'UPDATE_CONFIGURATION';
    const newConf = await this.applicationConfigModel.findOneAndUpdate(
      { _id: parameter },
      configuration,
    );
    if (newConf) {
      response.message = 'Configuration applied successfully';
      response.status = HttpStatus.OK;
      response.payload = configuration;
    } else {
      response.message = 'Configuration failed';
      response.status = HttpStatus.BAD_REQUEST;
      response.payload = configuration;
    }
    return response;
  }

  async deleteConfig(parameter: string): Promise<SetConfigDTOResponse> {
    const response = new SetConfigDTOResponse();
    response.transaction_classify = 'DELETE_CONFIGURATION';
    const newConf = this.applicationConfigModel.findOneAndDelete({
      _id: parameter,
    });
    if (newConf) {
      response.message = 'Configuration applied successfully';
      response.status = HttpStatus.OK;
      response.payload = newConf;
    } else {
      response.message = 'Configuration failed';
      response.status = HttpStatus.BAD_REQUEST;
      response.payload = newConf;
    }
    return response;
  }

  async getConfig(parameter: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.SYSTEMCONFIG_KEY}-${parameter}`;
    const redisSystemConfig: any = await this.cacheManager.get(key);

    if (redisSystemConfig) {
      console.log(
        `REDIS|Load systemconfig ${parameter} from Redis|${Date.now() - now}`,
      );

      return redisSystemConfig?.param_value;
    } else {
      const data = await this.applicationConfigModel.findOne({
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

  async checkConfig(configName: string): Promise<boolean> {
    const config = await this.applicationConfigModel.findOne({
      param_key: configName,
    });

    if (config && config.param_value) {
      return true;
    } else {
      return false;
    }
  }

  async getSystemToken() {
    // const data = await this.applicationConfigModel.findOne({
    //   param_key: 'SYSTEM_TOKEN',
    // });

    const data = await this.getConfig('SYSTEM_TOKEN');

    if (data) {
      let token = data.toString().replace('Bearer', ''); // remove string 'Bearer', set again in service
      token = token.replace(' ', ''); // remove space

      return token;
    }

    return null;
  }

  async checkKeywordPriority(keywordName) {
    const now = new Date();

    const key = `${RedisDataKey.KEYWORDPRIORITY_KEY}-${keywordName}`;
    const keywordPriorityRedis: any = await this.cacheManager.get(key);
    let result = null;

    console.log(`-> [Keyword Priority] Checking: ${keywordName}`);
    console.log(
      `-> [Keyword Priority] Exist in redis? ${
        keywordPriorityRedis ? 'true' : 'false'
      }`,
    );

    if (keywordPriorityRedis) {
      const validDate =
        new Date(keywordPriorityRedis.start) <= now &&
        new Date(keywordPriorityRedis.end) >= now;

      // console.log(new Date(keywordPriorityRedis.start) <= now);
      // console.log(new Date(keywordPriorityRedis.end) >= now);

      console.log(
        `-> [Keyword Priority] Checking date from Redis, is valid date? ${validDate}`,
      );

      if (validDate) {
        result = keywordPriorityRedis;
      }
      /*
    } else {
      const keywordPriority = await this.keywordPriorityModel.findOne({
        keyword: keywordName,
        start: { $lte: now },
        end: { $gte: now },
      });

      console.log(
        `-> [Keyword Priority] Exist in database? ${
          keywordPriority ? 'true' : 'false'
        }`,
      );

      if (keywordPriority) {
        await this.cacheManager.set(key, keywordPriority);
        result = keywordPriority;
      }
    */
    }

    console.log(
      `-> [Keyword Priority] Value: ${
        result?.priority?.toUpperCase() ?? 'DEFAULT'
      }`,
    );

    return result;
  }

  async redis_reload(req) {
    try {
      await this.slRedisService.deleteAll('*');
      this.slRedisService.reloadAll();
    } catch (err) {
      console.error('Redis Reload Error!', err?.message);
      return err?.message;
    }

    return 'OK';
  }

  async auth_reload(req) {
    try {
      await this.authorizationModel.find().then(async (data) => {
        data.map(async (a) => {
          await this.cacheManager.set(a.url, a.role, { ttl: 0 });
        });
      });
    } catch (err) {
      console.error('Redis Reload Error!', err?.message);
      return err?.message;
    }

    return 'OK';
  }

  async redis_delete(req, param) {
    try {
      return await this.slRedisService.deleteAll(param.key);
    } catch (err) {
      console.error('Redis Delete Error!', err?.message);
      return err?.message;
    }
  }
}
