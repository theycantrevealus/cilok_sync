import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CacheStore,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  CustomerMostRedeem,
  CustomerMostRedeemDocument,
} from '@reporting_statistic/model/reward-catalog/customer-most-redeem.model';
import { RedisDataKey } from '@slredis/const/redis.key';
import { response } from 'express';
import { createReadStream } from 'fs';
import { Model } from 'mongoose';
import { Readable } from 'nodemailer/lib/xoauth2';
import { join } from 'path';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { allowedMSISDN } from '@/application/utils/Msisdn/formatter';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { TransactionHttpservice } from '@/transaction/config/transaction-http.service';
import { PointPayload } from '@/transaction/dtos/point/view_current_balance/point-data';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import {
  ListOfPoint,
  RewardCalaogueParamDTO,
  RewardCalaogueQueryDTO,
} from '@/transaction/dtos/reward-catalogue/reward-catalogue.query';
import { RewardCatalogueRequestDto } from '@/transaction/dtos/reward-catalogue/reward-catalogue.request.dto';

import { PointService } from '../point/point.service';
const moment = require('moment-timezone');

@Injectable()
export class RewardCatalogueService {
  private httpService: TransactionHttpservice;
  private defaultLimitRewardCatalogueBySub: number;
  constructor(
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    httpService: TransactionHttpservice,
    private pointService: PointService,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    @InjectModel(CustomerMostRedeem.name)
    private customerMostRedeemModel: Model<CustomerMostRedeemDocument>,
    private appsService: ApplicationService,
  ) {
    this.httpService = httpService;
    this.defaultLimitRewardCatalogueBySub = 5;
  }

  async get_reward(payload: RewardCatalogueRequestDto) {
    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .get(`${payload.msisdn}/reward-catalogue`, {
          params: payload.query,
          headers: this.httpService.getHeaders(payload.token),
        })
        .pipe(
          map(async (res) => {
            const data = res;
            return data;
          }),
          catchError(async (err: any) => {
            if (err.response.status === HttpStatus.NOT_FOUND) {
              return this.getMockResponse();
            }

            throwError(
              () => new HttpException(err.response.data, err.response.status),
            );
            return err;
          }),
        ),
    );
  }

  getMockResponse() {
    return {
      code: 'S00000',
      message: 'Success',
      transaction_classify: 'TRANSACTION_GET_REWARD_CATALOGUE_BY_SUBSRIBER',
      payload: {
        point: [
          {
            keyword: 'JJNOLN',
          },
          {
            keyword: 'COMBSAK',
          },
        ],
        transactions: [
          {
            keyword: 'JJNOLN',
          },
        ],
        lowest_point: [
          {
            keyword: 'JJNOLN',
          },
          {
            keyword: 'COMBSAK',
          },
        ],
      },
    };
  }

  async get_rewardv2_old(
    paramDto: RewardCalaogueParamDTO,
    queryDto: RewardCalaogueQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    if (allowedMSISDN(paramDto.msisdn)) {
      const queryPointDto = new ViewPointQueryDTO();
      const pointByMsisdn = await this.pointService.new_customer_point_balance(
        paramDto.msisdn,
        queryPointDto,
        token,
      );
      if (pointByMsisdn.code === 'S00000') {
        const pointData = (pointByMsisdn.payload as PointPayload).list_of_point;
        const totalPoint = pointData.reduce(
          (acc, curr) => acc + curr.total_point,
          0,
        );
        const limitValue: number = parseInt(
          queryDto?.limit?.toString(),
          this.defaultLimitRewardCatalogueBySub,
        );

        const highest_point = await this.get_reward_by_points(
          paramDto.msisdn,
          totalPoint,
          limitValue,
          -1,
        );

        const lowest_point = await this.get_reward_by_points(
          paramDto.msisdn,
          totalPoint,
          limitValue,
          1,
        );

        const transaction = await this.get_reward_by_transaction(
          paramDto.msisdn,
          totalPoint,
          limitValue,
          -1,
        );

        const payload = {
          poin: highest_point,
          transactions: transaction,
          lowest_poin: lowest_point,
        };

        responseGlobal.code = HttpCodeTransaction.CODE_SUCCESS_200;
        responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
        responseGlobal.payload = payload;
        return responseGlobal;
      } else {
        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.message = 'member not found';
        responseGlobal.payload = {
          trace_id: false,
        };
        return responseGlobal;
      }
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async get_rewardv2(
    paramDto: RewardCalaogueParamDTO,
    queryDto: RewardCalaogueQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    if (allowedMSISDN(paramDto.msisdn)) {
      const queryPointDto = new ViewPointQueryDTO();
      const pointByMsisdn = await this.pointService.new_customer_point_balance(
        paramDto.msisdn,
        queryPointDto,
        token,
      );
      if (pointByMsisdn.code === 'S00000') {
        const pointData = (pointByMsisdn.payload as PointPayload).list_of_point;
        const totalPoint = pointData.reduce(
          (acc, curr) => acc + curr.total_point,
          0,
        );

        const limitValue: number = queryDto?.limit
          ? parseInt(queryDto?.limit.toString())
          : this.defaultLimitRewardCatalogueBySub;

        // Parse the filter object
        let filter = {};
        if (queryDto.filter) {
          try {
            filter = JSON.parse(queryDto.filter);
          } catch (error) {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'Invalid filter format';
            responseGlobal.payload = { trace_id: false };
            return responseGlobal;
          }
        }

        const filterType = filter['type'] ? filter['type'].toLowerCase() : null;
        const rewardTypes = filterType ? filterType?.split('|') : [];

        const payload = {};

        // Conditionally fetch rewards based on filter
        if (!filterType || rewardTypes.includes('poin')) {
          const highest_point = await this.get_reward_by_points(
            paramDto.msisdn,
            totalPoint,
            limitValue,
            -1,
          );
          payload['poin'] = highest_point;
        }

        if (!filterType || rewardTypes.includes('transaction')) {
          const transaction = await this.get_reward_by_transaction(
            paramDto.msisdn,
            totalPoint,
            limitValue,
            -1,
          );
          payload['transactions'] = transaction;
        }

        if (!filterType || rewardTypes.includes('lowest')) {
          const lowest_point = await this.get_reward_by_points(
            paramDto.msisdn,
            totalPoint,
            limitValue,
            1,
          );
          payload['lowest_poin'] = lowest_point;
        }

        responseGlobal.code = HttpCodeTransaction.CODE_SUCCESS_200;
        responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
        responseGlobal.payload = payload;
        return responseGlobal;
      } else {
        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.message = 'member not found';
        responseGlobal.payload = {
          trace_id: false,
        };
        return responseGlobal;
      }
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async get_reward_by_points(
    msisdn: string = null,
    totalPoint: number,
    limit: number = this.defaultLimitRewardCatalogueBySub,
    sort: 1 | -1 = -1,
  ) {
    let result = null;
    const now = Date.now();

    const dateNow = moment().tz('Asia/Jakarta').toISOString();

    // Configurable TTL Redis default value 6 hours
    const TTLRedisRC =
      (await this.appsService.getConfig(
        'TTL_REDIS_REWARD_CATALOGUE_BY_SUBS',
      )) || 24;

    const checkStatusRedisRC =
      (await this.appsService.getConfig(
        'IS_REWARD_CATALOGUE_BY_SUBS_REDIS_ACTIVE',
      )) || false;

    let key = `${
      RedisDataKey.RC_BY_SUBS_POINTS_HIGHEST_KEY
    }-${totalPoint.toString()}`;

    if (sort === 1) {
      key = `${
        RedisDataKey.RC_BY_SUBS_POINTS_LOWEST_KEY
      }-${totalPoint.toString()}`;
    }

    const redisRewardCataloguePoints: any = await this.cacheManager.get(key);

    if (redisRewardCataloguePoints && checkStatusRedisRC == true) {
      console.log(
        `REDIS|Load reward_catalogue points ${totalPoint} from Redis|${
          Date.now() - now
        }`,
      );
      result = redisRewardCataloguePoints;
    } else {
      const points = await this.keywordModel.aggregate([
        {
          $match: {
            $and: [
              { reward_catalog: { $exists: true } },
              { 'reward_catalog.point_keyword': { $ne: null } },
              { 'reward_catalog.point_keyword': { $ne: 0 } },
              { 'reward_catalog.point_keyword': { $ne: '' } },
              { 'reward_catalog.point_keyword': { $lte: totalPoint } },
              { 'reward_catalog.point_keyword': { $gt: 0 } },
              { 'reward_catalog.effective': { $lte: dateNow } },
              { 'reward_catalog.to': { $gte: dateNow } },
              { is_stoped: false },
              {
                'reward_catalog.created_at': {
                  $ne: '',
                },
              },
              { hq_approver: { $exists: true } },
              { deleted_at: null },
              { 'eligibility.name': { $not: { $regex: /-EDIT/ } } },
              { keyword_edit: null },
            ],
          },
        },
        {
          $sort: { 'reward_catalog.point_keyword': sort },
        },
        {
          $limit: limit,
        },
        {
          $group: {
            _id: null,
            points: {
              $push: {
                keyword: '$eligibility.name',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
      ]);

      if (points.length > 0) {
        if (checkStatusRedisRC == true) {
          const ttl = TTLRedisRC * 60 * 60;
          await this.cacheManager.set(key, points[0].points, { ttl: ttl });
        }

        result = points[0].points;
      }
    }

    return result;
  }

  async get_reward_by_transaction(
    msisdn: string,
    totalPoint: number,
    limit: number = this.defaultLimitRewardCatalogueBySub,
    sort: 1 | -1 = -1,
  ) {
    // Configurable TTL Redis default value 6 hours
    const TTLRedisRC =
      (await this.appsService.getConfig(
        'TTL_REDIS_REWARD_CATALOGUE_BY_SUBS',
      )) || 6;

    const checkStatusRedisRC =
      (await this.appsService.getConfig(
        'IS_REWARD_CATALOGUE_BY_SUBS_REDIS_ACTIVE',
      )) || false;
    const now = Date.now();
    const dateNow = moment().tz('Asia/Jakarta').toISOString();
    let result = null;

    // const checkMostRedeem = await this.customerMostRedeemModel.aggregate([
    //   { $sort: { counter: -1 } },
    //   { $limit: 1 },
    //   { $match: { msisdn: msisdn } },
    //   { $project: { _id: 0, program_experience_id: 1 } },
    // ]);

    const checkMostRedeem = await this.customerMostRedeemModel.find(
      { msisdn: msisdn },
      { _id: 0, program_experience_id: 1 },
      { sort: { counter: -1 }, limit : 1 }
    );

    if (checkMostRedeem.length > 0) {
      const programExperienceId = checkMostRedeem[0]?.program_experience_id;
      const key = `${RedisDataKey.RC_BY_SUBS_TRANSACTION_KEY}-${programExperienceId}-${totalPoint}`;

      if (checkStatusRedisRC) {
        const redisData = await this.cacheManager.get(key);

        if (redisData) {
          console.log(
            `REDIS|Load reward_catalogue transaction ${programExperienceId} from Redis|${
              Date.now() - now
            }`,
          );
          return redisData;
        }
      }

      const transaction = await this.customerMostRedeemModel.aggregate([
        { $match: { msisdn: msisdn } },
        { $sort: { counter: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'keywords',
            let: { localProgramExperienceId: '$program_experience_id' },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      reward_catalog: { $exists: true },
                      'reward_catalog.effective': { $lte: dateNow },
                      'reward_catalog.to': { $gte: dateNow },
                      'reward_catalog.created_at': { $ne: '' },
                      is_stoped: false,
                      hq_approver: { $exists: true },
                      'reward_catalog.point_keyword': { $lte: totalPoint },
                      'eligibility.name': { $not: /-EDIT/ },
                      keyword_edit: null,
                      deleted_at: null,
                    },
                    { 'reward_catalog.point_keyword': { $gt: 0 } },
                    {
                      $expr: {
                        $in: [
                          '$$localProgramExperienceId',
                          { $ifNull: ['$eligibility.program_experience', []] },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                $sort: { 'reward_catalog.point_keyword': sort },
              },
              { $addFields: { keyword: '$eligibility.name' } },
              { $project: { _id: 0, keyword: 1 } },
              { $limit: limit },
            ],
            as: 'transaction',
          },
        },
        { $project: { _id: 0, transaction: 1 } },
      ]);

      if (transaction.length > 0) {
        if (checkStatusRedisRC) {
          const ttl = TTLRedisRC * 60 * 60;
          await this.cacheManager.set(key, transaction[0].transaction, {
            ttl: ttl,
          });
        }
        result = transaction[0].transaction;
      }
    }

    return result;
  }

  async getXmlFile(): Promise<Readable> {
    const filePath = join(
      __dirname,
      '..',
      'reward-catalog-mytsel',
      'reward-catalog.xml',
    );
    const stream = createReadStream(filePath);
    return stream;
  }
}
