import { HttpService } from '@nestjs/axios';
import {
  CACHE_MANAGER,
  CacheStore,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { SlRedisService } from '@slredis/slredis.service';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
import { Model, Types } from 'mongoose';
import { Logger } from 'winston';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Bid, BidDocument } from '@/transaction/models/bid/bid.model';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

import {
  KafkaMbseConsumerLogs,
  KafkaMbseConsumerLogsDocument,
} from '../models/kafka_mbse_consumer_logs';
import {
  PostpaidGranularLog,
  PostpaidGranularLogDocument,
  PostpaidGranularLogEnum,
  PostpaidGranularTransactionEnum,
} from '../models/postpaid_granular_log';
import { SlIntegration } from './integration/sl.integration';

type redeemParamType = {
  transaction_source: any;
  msisdn: string;
  keyword: any;
  token: string;
  account: Account;
  path: string;
  channel_id?: string;
  business_id: string; // BID
  channel_transaction_id: string; // Order ID
};

@Injectable()
export class PostpaidGranularService {
  private httpService: HttpService;
  private urlSL: string;
  private integration: SlIntegration;
  private trace_id: Types.ObjectId;
  private startDate: Date;
  private msisdn?: string;
  private keyword?: string;

  constructor(
    httpService: HttpService,
    private readonly configService: ConfigService,
    integration: SlIntegration,

    @InjectModel(PostpaidGranularLog.name)
    private postpaidGranularLog: Model<PostpaidGranularLogDocument>,

    @InjectModel(KafkaMbseConsumerLogs.name)
    private kafkaMbseConsumerLogs: Model<KafkaMbseConsumerLogsDocument>,

    private utilsService: UtilsService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    @Inject(RedeemService)
    private readonly redeemService: RedeemService,

    @Inject(AccountService)
    private readonly accountService: AccountService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,

    @Inject(SlRedisService)
    private slRedisService: SlRedisService,

    @Inject(ApplicationService)
    private applicationService: ApplicationService,
  ) {
    this.integration = integration;
    this.httpService = httpService;
    this.urlSL = `${configService.get<string>('application.hostport')}`;
    this.startDate = new Date();
  }

  /**
   * process inject postpaid granular
   * @param payload
   * @param account
   */

  async process(msg: any, offset, account, token) {
    const payload = JSON.parse(msg);
    const infos = payload?.infos?.map;
    const msisdn = infos?.ServiceNumber?.string;
    const channel_id = infos?.channel_id?.string;
    const keyword = infos?.Keyword?.string;
    const status = infos?.Status?.string;
    const contrat = infos?.contract?.string;
    const externalProductId = infos?.ExternalProductId?.string;
    const orderID = infos?.OrderID?.string;

    this.msisdn = msisdn;
    this.keyword = keyword;

    const objectLog: any = {
      msisdn: msisdn,
      keyword: keyword,
      status: status,
      contract: contrat,
      externalProductId: externalProductId,
      offset: offset,
      orderID: orderID,
    };

    const payloadLog = JSON.stringify(objectLog);
    if (status?.toUpperCase() !== 'COMPLETE') {
      const payloadLog: any = {
        msisdn: msisdn,
        keyword: keyword,
        status: status,
        contract: contrat,
        externalProductId: externalProductId,
        orderId: orderID,
        account: account,
      };

      // return this.loggerGranular(
      //   payloadLog,
      //   `Skipped because status not completed (Payload: ${payloadLog})`,
      //   'error',
      //   this.startDate,
      //   HttpStatus.EXPECTATION_FAILED,
      // );

      return this.loggerGranularNew(
        payloadLog,
        'Skipped because status not completed',
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    const param: redeemParamType = {
      msisdn: msisdn,
      keyword: keyword,
      token: token,
      account: account,
      path: '/v2/redeem',
      channel_id: channel_id,
      business_id: externalProductId,
      channel_transaction_id: orderID,
      transaction_source: 'POSTPAID-GRANULAR',
    };

    this.loggerGranularNew(
      payloadLog,
      'Processing',
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );

    if (keyword) {
      return await this.redeemProcess(param);
    } else {
      if (externalProductId) {
        // this.loggerGranular(
        //   payloadLog,
        //   { data: msg },
        //   'verbose',
        //   this.startDate,
        //   HttpStatus.OK,
        // );

        if (contrat) {
          const postpaidBids = await this.getBidDataFromRedis(
            externalProductId,
            contrat,
          );

          // bid one to one with keyword
          if (postpaidBids?.length === 1) {
            const oneBidData = postpaidBids[0];

            // keyword is exist
            if (oneBidData?.keyword_name) {
              param.keyword = oneBidData.keyword_name;
              return await this.redeemProcess(param);
            } else {
              // return this.loggerGranular(
              //   payloadLog,
              //   `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
              //   'verbose',
              //   this.startDate,
              //   HttpStatus.BAD_REQUEST,
              // );

              return this.loggerGranularNew(
                payloadLog,
                'Skip because keyword name is null or keyword is not found',
                'error',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
            }
          }

          // return this.loggerGranular(
          //   payloadLog,
          //   `Skip because externalProductId & contract existing in the Bid Management (Payload: ${payloadLog})`,
          //   'verbose',
          //   this.startDate,
          //   HttpStatus.BAD_REQUEST,
          // );

          return this.loggerGranularNew(
            payloadLog,
            'Skip because externalProductId & contract existing in the Bid Management',
            'error',
            this.startDate,
            HttpStatus.BAD_REQUEST,
          );

          /**
           * DEPRECATED: 2024-10-22
           *
           * - Change to Redis method
           *
          await this.bidModel
            .find({
              external_product_id: externalProductId,
              contract: contrat,
              deleted_at: null,
            })
            .exec()
            .then(async (res) => {
              if (res.length === 1) {
                const keywordId = res[0].keyword;
                const keyword = await this.keywordModel
                  .findOne({ _id: keywordId })
                  .exec();

                param.keyword = keyword?.eligibility?.name;

                return await this.redeemProcess(param);
              }

              return this.loggerGranular(
                payloadLog,
                `Skip because externalProductId & contract existing in the Bid Management (Payload: ${payloadLog})`,
                'verbose',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
            });
            */
        } else {
          const postpaidBids = await this.getBidDataFromRedis(
            externalProductId,
          );

          // bid one to one with keyword
          if (postpaidBids?.length === 1) {
            const oneBidData = postpaidBids[0];

            // keyword is exist
            if (oneBidData?.keyword_name) {
              param.keyword = oneBidData.keyword_name;
              return await this.redeemProcess(param);
            } else {
              // return this.loggerGranular(
              //   payloadLog,
              //   `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
              //   'verbose',
              //   this.startDate,
              //   HttpStatus.BAD_REQUEST,
              // );

              return this.loggerGranularNew(
                payloadLog,
                'Skip because keyword name is null or keyword is not found',
                'error',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
            }
          }

          // return this.loggerGranular(
          //   payloadLog,
          //   `Skip because externalProductId & contract existing in the Bid Managemen (Payload: ${payloadLog})`,
          //   'verbose',
          //   this.startDate,
          //   HttpStatus.BAD_REQUEST,
          // );

          return this.loggerGranularNew(
            payloadLog,
            'Skip because externalProductId & contract existing in the Bid Managemen',
            'error',
            this.startDate,
            HttpStatus.BAD_REQUEST,
          );

          /**
           * DEPRECATED: 2024-10-22
           *
           * - Change to Redis method
           *
          await this.bidModel
            .find({
              external_product_id: externalProductId,
              deleted_at: null,
            })
            .exec()
            .then(async (res) => {
              if (res.length === 1) {
                const keywordId = res[0].keyword;
                const keywordQuery = await this.keywordModel
                  .findOne({ _id: keywordId })
                  .exec();

                this.keyword = keyword?.eligibility?.name;
                param.keyword = keywordQuery?.eligibility?.name;

                return await this.redeemProcess(param);
              }

              return this.loggerGranular(
                payloadLog,
                `Skip because externalProductId & contract existing in the Bid Managemen (Payload: ${payloadLog})`,
                'verbose',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
            });
            */
        }
      }

      // return this.loggerGranular(
      //   payloadLog,
      //   `Skip (Payload: ${payloadLog})`,
      //   'verbose',
      //   this.startDate,
      //   HttpStatus.BAD_REQUEST,
      // );

      return this.loggerGranularNew(
        payloadLog,
        'Skip',
        'error',
        this.startDate,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async redeemProcess(param: redeemParamType) {
    const redeemParams: any = {
      msisdn: param.msisdn,
      keyword: param.keyword,
      send_notification: true,
      additional_param: {
        channel_transaction_id: param.channel_transaction_id,
        business_id: param.business_id,
        transaction_source: param.transaction_source,
      },
    };

    if (param.channel_id) {
      redeemParams.channel_id = param.channel_id;
    }

    try {
      // get redeem priority from config
      const redeemPriority = await this.applicationService.getConfig(
        'PRIORITY_POSTPAID_GRANULAR',
      );

      const redeemRes = await this.redeemService.redeem_v2_topic(
        redeemParams,
        param.account,
        param.token,
        param.path,
        true,
        redeemPriority,
      );

      return this.return_res(redeemRes);
    } catch (error) {
      return this.loggerGranularNew(
        JSON.stringify(param),
        `Error Redeem ${error}`,
        'error',
        this.startDate,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async return_res(response) {
    return this.loggerGranularNew(
      JSON.stringify(response),
      `Complete`,
      'verbose',
      this.startDate,
      HttpStatus.OK,
      response?.payload?.trx_id,
    );

    /*
    if (response.code === 'S00000') {
      const data = response.payload;
      const rowData = new this.postpaidGranularLog({
        msisdn: this.msisdn,
        keyword: this.keyword,
        trace_id: this.trace_id,
        trx_id: response?.payload?.trace_id,
        transaction_name: PostpaidGranularTransactionEnum.REDEEM,
        status: PostpaidGranularLogEnum.SUCCESS,
        payload: data,
      });

      await rowData
        .save()
        .then((data) => {
          return this.loggerGranularNew(
            response,
            `Complete`,
            'verbose',
            this.startDate,
            HttpStatus.OK,
            data?.trx_id,
          );
        })
        .catch((error) => {
          return this.loggerGranularNew(
            response,
            `Error Redeem ${error}`,
            'error',
            this.startDate,
            HttpStatus.BAD_REQUEST,
          );
        });
    } else {
      const rowData = new this.postpaidGranularLog({
        msisdn: this.msisdn,
        keyword: this.keyword,
        trace_id: this.trace_id,
        trx_id: response?.payload?.trace_id,
        transaction_name: PostpaidGranularTransactionEnum.REDEEM,
        status: PostpaidGranularLogEnum.FAIL,
        error: response.message,
      });

      await rowData
        .save()
        .then((data) => {
          return this.loggerGranularNew(
            response,
            `Failed Redeem`,
            'verbose',
            this.startDate,
            HttpStatus.OK,
            data?.trx_id,
          );
        })
        .catch((error) => {
          return this.loggerGranularNew(
            response,
            `Error Redeem ${error}`,
            'error',
            this.startDate,
            HttpStatus.BAD_REQUEST,
          );
        });
    }
    */
  }

  async loggerGranular(
    payload,
    message,
    level: string,
    start: Date,
    statusCode,
  ) {
    const end = new Date();

    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.externalProductId,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: statusCode,
      payload: {
        service: 'postpaid-granular',
        user_id: payload?.account,
        method: 'kafka',
        url: 'postpaid-granular',
        step: `Postpaid Granular ${message}`,
        param: payload,
        result: {
          message: message,
          keyword: payload?.keyword,
          msisdn: payload?.msisdn,
        },
      } satisfies LoggingData,
    });
  }

  async loggerGranularNew(
    payload,
    step,
    level: string,
    start: Date,
    statusCode,
    trx_id = null,
  ) {
    const end = new Date();

    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: trx_id ?? payload?.orderId,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: statusCode,
      payload: {
        service: 'postpaid-granular',
        user_id: payload?.account,
        method: 'kafka',
        url: 'postpaid-granular',
        step: step,
        param: payload,
        result: {
          message: payload,
          keyword: payload?.keyword,
          msisdn: payload?.msisdn,
          trace: trx_id ?? payload?.orderId,
        },
      } satisfies LoggingData,
    });
  }

  async getBidDataFromRedis_old(bidId, contract = null) {
    const now = Date.now();

    let key = `${RedisDataKey.BID_KEY}-${bidId}`;
    if (contract) {
      key = `${key}-${contract}`;
    }

    const redisBid: any = await this.cacheManager.get(key);

    if (redisBid) {
      console.log(`REDIS|Load BID ${bidId} from Redis|${Date.now() - now}`);

      return redisBid;
    } else {
      const data = await this.bidModel.aggregate([
        {
          $match: {
            external_product_id: bidId,
            deleted_at: null,
          },
        },
        {
          $lookup: {
            from: 'keywords',
            let: {
              keyword_id: '$keyword',
            },
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
                              input: '$$keyword_id',
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
            ],
            as: 'keyword_detail',
          },
        },
        {
          $unwind: {
            path: '$keyword_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            keywordName: {
              $ifNull: ['$keyword_detail.eligibility.name', null],
            },
          },
        },
        {
          $project: {
            keyword_detail: false,
          },
        },
      ]);

      console.log(`REDIS|Load BID ${bidId} from Database|${Date.now() - now}`);

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
      }

      return data;
    }
  }

  async getBidDataFromRedis(bidId, contract = null) {
    const now = Date.now();

    let key = `${RedisDataKey.BID_KEY}-${bidId}`;
    if (contract) {
      key = `${key}-${contract}`;
    }

    const redisBid: any = await this.cacheManager.get(key);

    if (redisBid) {
      console.log(`REDIS|Load BID ${bidId} from Redis|${Date.now() - now}`);

      return redisBid;
    } else {
      const bidQuery = {
        external_product_id: bidId,
        deleted_at: null,
      };

      if (contract) {
        bidQuery['contract'] = contract;
      }

      let data: any = await this.bidModel.find(bidQuery);

      data = await Promise.all(
        data.map(async (d) => {
          const ret = {
            ...d._doc,
          };

          // get keyword detail
          const keywordDetail = await this.keywordModel.findOne({
            _id: d.keyword,
          });

          // keyword name is null?
          if (!d?.keyword_name) {
            ret.keyword_name = keywordDetail?.eligibility?.name ?? null;
            ret.keyword = keywordDetail;

            // update BID data
            await this.bidModel.updateOne(
              {
                _id: ret._id,
              },
              ret,
            );
          }

          const bonus: any = keywordDetail?.bonus?.[0];

          ret.bonus_type = bonus?.bonus_type;
          ret.loyalty_poin = bonus?.earning_poin ?? null;

          return ret;
        }),
      );

      console.log(`REDIS|Load BID ${bidId} from Database|${Date.now() - now}`);

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
      }

      return data;
    }
  }
}
