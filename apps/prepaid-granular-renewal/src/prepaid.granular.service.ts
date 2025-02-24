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
import {
  PrepaidGranularTransaction,
  PrepaidGranularTransactionDocument,
} from '@prepaid_granular/models/prepaid-granular-transaction.model';
import { RedisDataKey } from '@slredis/const/redis.key';
// import { SlRedisService } from '@slredis/slredis.service';
// import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { plainToClass } from 'class-transformer';
// import { UtilsService } from '@utils/services/utils.service';
import { Model, Types } from 'mongoose';

// import { Logger } from 'winston';
import { Account } from '@/account/models/account.model';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
// import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { checkCustomerIdentifier } from '@/application/utils/Msisdn/formatter';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import { Bid, BidDocument } from '@/transaction/models/bid/bid.model';
import { PointService } from '@/transaction/services/point/point.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

// import {
//   KafkaMbseConsumerLogs,
//   KafkaMbseConsumerLogsDocument,
// } from '../models/kafka_mbse_consumer_logs';
// import {
//   PrepaidGranularLog,
//   PrepaidGranularLogDocument,
//   PrepaidGranularLogEnum,
//   PrepaidGranularTransactionEnum,
// } from '../models/prepaid_granular_log';
import { InjectCorePayloadDto } from './dto/inject-core-payload.dto';
import { EventCodeEnum } from './enum/event-code.enum';
import { SlIntegration } from './integration/sl.integration';
const moment = require('moment-timezone');

type redeemParamType = {
  msisdn: string;
  keyword: any;
  token: string;
  account: Account;
  path: string;
  channel_id?: string;
  business_id: string; // BID
  channel_transaction_id: string; // Order ID
  transaction_source: string;
  order_id: string;
};

@Injectable()
export class PrepaidGranularService {
  // private httpService: HttpService;
  // private urlSL: string;
  // private integration: SlIntegration;
  private trace_id: Types.ObjectId;
  private startDate: Date;
  private msisdn?: string;
  private keyword?: string;
  private readonly DEFAULT_SPESIAL_MULTIPLIER = 1;
  private readonly EARN_BY_REVENUE = -1;
  private readonly NO_EARN_ACCUM_ONLY = 0;
  private readonly ALLOWED_BID_TYPE = ['KEYWORD', 'AMOUNT'];
  private readonly NOT_ALLOWED_PAYMENT_METHOD = ['LOAN', 'NOCHARGE'];
  private readonly NOT_ALLOWED_PURCHASE_MODE = ['INJECT'];
  private readonly REN_CORP_ORDER_TYPE = 'REN_CORP';
  private readonly REN_ORDER_TYPE = 'REN';

  constructor(
    httpService: HttpService,
    private readonly configService: ConfigService,
    integration: SlIntegration,

    // @InjectModel(PrepaidGranularLog.name)
    // private prepaidGranularLog: Model<PrepaidGranularLogDocument>,

    // @InjectModel(KafkaMbseConsumerLogs.name)
    // private kafkaMbseConsumerLogs: Model<KafkaMbseConsumerLogsDocument>,

    // private utilsService: UtilsService,

    // @Inject(WINSTON_MODULE_PROVIDER)
    // private readonly logger: Logger,

    @InjectModel(Bid.name)
    private bidModel: Model<BidDocument>,

    @InjectModel(PrepaidGranularTransaction.name)
    private prepaidGranularTrx: Model<PrepaidGranularTransactionDocument>,

    @Inject(RedeemService)
    private readonly redeemService: RedeemService,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    // @Inject(AccountService)
    // private readonly accountService: AccountService,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,

    // @Inject(SlRedisService)
    // private slRedisService: SlRedisService,

    @Inject(ApplicationService)
    private applicationService: ApplicationService,

    @Inject(PointService)
    private pointService: PointService,
    private transactionOptional: TransactionOptionalService,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
  ) {
    // this.integration = integration;
    // this.httpService = httpService;
    // this.urlSL = `${configService.get<string>('application.hostport')}`;
    this.startDate = new Date();
  }

  /**
   * process inject pretpaid granular DOM
   * @param payload
   * @param account
   */

  async domProcess(msg: any, offset, account, token) {
    console.log('======== START ========');
    const startProcess = new Date();
    const submitTime = moment().utc();
    const payload = JSON.parse(msg);
    const infos = payload?.infos?.map;
    const channel_id = infos?.channel_id?.string;
    const status = infos?.status?.string;
    const externalProductId = infos?.business_id?.string;
    const channelTransactionId = infos?.channel_transaction_id?.string;
    const purchaseMode = infos?.purchase_mode?.string;
    const paymentMethod = infos?.payment_method?.string;
    const orderType = infos?.order_type?.string;
    const orderId = infos?.order_id?.string;
    const transactionAmount = infos?.price?.string;
    const offerName = infos?.offer_name?.string ?? ' ';
    const msisdn = this.setMsisdn(
      orderType?.toUpperCase(),
      purchaseMode?.toUpperCase(),
      infos,
    );

    this.msisdn = msisdn;

    const objectLog: any = {
      msisdn,
      status,
      external_product_id: externalProductId,
      channel_transaction_id: channelTransactionId,
      transaction_amount: transactionAmount,
      purchase_mode: purchaseMode,
      payment_method: paymentMethod,
      order_type: orderType,
      offset,
      offer_name: offerName,
      token,
      order_id: orderId,
    };
    console.log('OBJECT LOG', objectLog);

    const payloadLog = JSON.stringify(objectLog);

    try {
      const isValidCondition = this.validationProcess(
        purchaseMode?.toUpperCase(),
        paymentMethod?.toUpperCase(),
        orderType?.toUpperCase(),
        objectLog,
        startProcess,
      );
      console.log('isValidCondition', isValidCondition);

      if (!isValidCondition) {
        return;
      }

      const isUniqueOrderId = await this.validateUniqueOrderId(
        orderId,
        payloadLog,
        startProcess,
      );

      // temporary nft
      // if (!isUniqueOrderId) {
      //   return;
      // }

      let is_skipAccum = false;
      const bidDatas = await this.getBidDataFromRedis(externalProductId);
      const earningDto = plainToClass(InjectCorePayloadDto, {
        transaction_no: null,
        event_code: null,
        point: 0,
        revenue: 0,
        sp_multiplier: this.DEFAULT_SPESIAL_MULTIPLIER,
        msisdn,
        package_name: offerName,
        order_id: orderId,
        business_id: externalProductId,
        default_earning: false,
      });
      console.log('bidDatas', bidDatas);

      if (bidDatas.length === 0) {
        console.log('NO BIDS FOUND - Do Default Earning');
        const getSystemConfig = await this.systemConfigModel.findOne({
          param_key: 'REV_MULTIPLY_TRX_DEFAULT',
        });

        earningDto.event_code = getSystemConfig.param_value
          ? getSystemConfig.param_value.toString()
          : EventCodeEnum.REV_MULTIPLY_TRX_DEFAULT;
        earningDto.point = this.EARN_BY_REVENUE;
        earningDto.revenue = Number(transactionAmount);
        earningDto.default_earning = true;

        await this.injectCore(earningDto, objectLog, startProcess);
        return;
      }

      const isAllExpiredBids = this.checkAllExpiredBids(bidDatas, submitTime);

      if (isAllExpiredBids) {
        console.log('ALL BIDS EXPIRED - Do Default Earning');
        const getSystemConfig = await this.systemConfigModel.findOne({
          param_key: 'REV_MULTIPLY_TRX_DEFAULT',
        });

        earningDto.event_code = getSystemConfig.param_value
          ? getSystemConfig.param_value.toString()
          : EventCodeEnum.REV_MULTIPLY_TRX_DEFAULT;
        earningDto.point = this.EARN_BY_REVENUE;
        earningDto.revenue = Number(transactionAmount);
        earningDto.default_earning = true;

        await this.injectCore(earningDto, objectLog, startProcess);
        return;
      }

      for (const bid of bidDatas) {
        console.log('BID', bid);

        if (!this.ALLOWED_BID_TYPE.includes(bid.type)) {
          this.loggerGranular(
            payloadLog,
            `Skip because bid type !== KEYWORD || AMOUNT (Payload: ${payloadLog})`,
            'verbose',
            startProcess,
            HttpStatus.BAD_REQUEST,
          );

          continue;
        }

        const startDate = moment(bid.start_date);
        const endDate = moment(bid.end_date);
        const validDate = submitTime.isBetween(startDate, endDate);

        if (!validDate) {
          console.log('INVALID DATE');

          this.loggerGranular(
            payloadLog,
            `Skip because validDate not required (Payload: ${payloadLog})`,
            'verbose',
            startProcess,
            HttpStatus.BAD_REQUEST,
          );

          continue;
        }

        if (bid.type === 'KEYWORD') {
          if (bid.default_earning && !is_skipAccum) {
            console.log('KEYWORD - bid.default_earning && !is_skipAccum');
            is_skipAccum = true;

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX_DEFAULT',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_MULTIPLY_TRX_DEFAULT;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = Number(transactionAmount);
            earningDto.default_earning = true;

            await this.injectCore(earningDto, objectLog, startProcess);
          } else if (!is_skipAccum) {
            console.log('KEYWORD - !is_skipAccum');
            is_skipAccum = true;

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_NO_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_NO_MULTIPLY_TRX;
            earningDto.point = this.NO_EARN_ACCUM_ONLY;
            earningDto.revenue = Number(transactionAmount);

            await this.injectCore(earningDto, objectLog, startProcess);
          }

          if (!bid?.keyword_name) {
            console.log('KEYWORD - !bid?.keyword_name');
            this.loggerGranular(
              payloadLog,
              `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
              'verbose',
              startProcess,
              HttpStatus.BAD_REQUEST,
            );

            continue;
          }

          const redeemParam: redeemParamType = {
            msisdn: msisdn,
            keyword: bid.keyword_name,
            token: token,
            account: account,
            path: '/v2/redeem',
            channel_id: channel_id,
            business_id: externalProductId,
            channel_transaction_id: channelTransactionId,
            order_id: orderId,
            transaction_source: 'PREPAID-GRANULAR-RENEWAL',
          };

          if (bid?.bonus_type == 'loyalty_poin') {
            if (bid?.tier_multiplier) {
              console.log('KEYWORD - bid?.tier_multiplier');

              const getSystemConfig = await this.systemConfigModel.findOne({
                param_key: 'REV_MULTIPLY_POINT',
              });

              earningDto.event_code = getSystemConfig.param_value
                ? getSystemConfig.param_value.toString()
                : EventCodeEnum.REV_MULTIPLY_POINT;
              earningDto.point = Number(bid?.loyalty_poin);
              earningDto.revenue = -Number(transactionAmount);

              await this.injectCore(earningDto, objectLog, startProcess);

              continue;
            } else if (!bid?.tier_multiplier) {
              console.log('KEYWORD - !bid?.tier_multiplier');
              await this.redeemProcess(redeemParam, startProcess);
              continue;
            }
          } else {
            console.log('KEYWORD - bid?.bonus_type != loyalty_poin');
            await this.redeemProcess(redeemParam, startProcess);
            continue;
          }
        }

        if (bid.type === 'AMOUNT') {
          //step 1
          if (bid.default_earning && !is_skipAccum) {
            console.log('AMOUNT - bid.default_earning && !is_skipAccum');
            is_skipAccum = true;

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX_DEFAULT',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_MULTIPLY_TRX_DEFAULT;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = Number(transactionAmount);
            earningDto.default_earning = true;

            await this.injectCore(earningDto, objectLog, startProcess);
          } else if (!is_skipAccum) {
            console.log('AMOUNT - !is_skipAccum');
            is_skipAccum = true;

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_MULTIPLY_TRX;
            earningDto.point = this.NO_EARN_ACCUM_ONLY;
            earningDto.revenue = Number(transactionAmount);

            await this.injectCore(earningDto, objectLog, startProcess);
          }
          // step 2

          if (bid.tier_multiplier && bid.special_multiplier) {
            console.log(
              'AMOUNT - bid.tier_multiplier && bid.special_multiplier',
            );

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_MULTIPLY_TRX;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = -Number(transactionAmount);
            earningDto.sp_multiplier = bid.special_multiplier_value;

            await this.injectCore(earningDto, objectLog, startProcess);

            continue;
          } else if (bid.tier_multiplier && !bid.special_multiplier) {
            console.log(
              'AMOUNT - bid.tier_multiplier && !bid.special_multiplier',
            );
            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_MULTIPLY_TRX;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = -Number(transactionAmount);
            earningDto.sp_multiplier = bid.special_multiplier_value;

            await this.injectCore(earningDto, objectLog, startProcess);

            continue;
          } else if (!bid.tier_multiplier && bid.special_multiplier) {
            console.log(
              'AMOUNT - !bid.tier_multiplier && bid.special_multiplier',
            );

            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_NO_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_NO_MULTIPLY_TRX;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = -Number(transactionAmount);
            earningDto.sp_multiplier = bid.special_multiplier_value;

            await this.injectCore(earningDto, objectLog, startProcess);

            continue;
          } else if (!bid.tier_multiplier && !bid.special_multiplier) {
            console.log(
              'AMOUNT - !bid.tier_multiplier && !bid.special_multiplier',
            );
            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_NO_MULTIPLY_TRX',
            });

            earningDto.event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : EventCodeEnum.REV_NO_MULTIPLY_TRX;
            earningDto.point = this.EARN_BY_REVENUE;
            earningDto.revenue = -Number(transactionAmount);

            await this.injectCore(earningDto, objectLog, startProcess);

            continue;
          }
        }
      }

      console.log('======== END ======== \n');
    } catch (error) {
      console.log('ERROR DOM PROCCESS', error.message);

      this.loggerGranular(
        { step: 'DOM Process' },
        `ERROR DOM PROCESS! Error: ${JSON.stringify({
          error_message: error.message,
          payload: objectLog,
        })}`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  async redeemProcess(param: redeemParamType, startProcess: Date) {
    const redeemParams: any = {
      msisdn: param.msisdn,
      keyword: param.keyword,
      send_notification: true,
      additional_param: {
        channel_transaction_id: param.order_id,
        // order_id: param.order_id,
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
        'PRIORITY_PREPAID_RENEWAL_GRANULAR',
      );

      const redeemRes = await this.redeemService.redeem_v2_topic(
        redeemParams,
        param.account,
        param.token,
        param.path,
        true,
        redeemPriority,
      );

      return this.return_res(redeemRes, startProcess);
    } catch (error) {
      return this.loggerGranular(
        param,
        'Error redeem' + error,
        'verbose',
        startProcess,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async return_res(response, startProcess: Date) {
    return this.loggerGranular(
      response,
      `Redeem Success (Trx_id: ${response?.payload?.trace_id})`,
      'verbose',
      startProcess,
      HttpStatus.OK,
    );
  }

  async loggerGranular(
    payload,
    message,
    level: string,
    start: Date,
    statusCode,
  ) {
    const end = new Date();
    const takenTime = Math.abs(end.getTime() - start.getTime());

    // TODO: service and url need to change prepaid-granular to prepaid-granular-renewal?
    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.externalProductId,
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        service: 'prepaid-granular-renewal',
        user_id: payload?.account,
        method: 'kafka',
        url: 'prepaid-granular-renewal',
        step: `Prepaid Granular Renewal ${payload?.step ?? '-'}`,
        taken_time: takenTime,
        param: payload,
        result: {
          message: message,
          msisdn: payload?.msisdn,
        },
      } satisfies LoggingData,
    });
  }

  async getBidDataFromRedis_old(bidId) {
    const now = Date.now();

    const key = `${RedisDataKey.BID_KEY}-${bidId}`;
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

  async getBidDataFromRedis(bidId) {
    const now = Date.now();

    const key = `${RedisDataKey.BID_KEY}-${bidId}`;
    const redisBid: any = await this.cacheManager.get(key);
    console.log('KEY', key);

    if (redisBid) {
      console.log(`REDIS|Load BID ${bidId} from Redis|${Date.now() - now}`);

      return redisBid;
    } else {
      const bidQuery = {
        external_product_id: bidId,
        deleted_at: null,
      };

      let data: any = await this.bidModel
        .find(bidQuery)
        .sort({ default_earning: -1 });
      console.log('DATA BID', data);

      data = await Promise.all(
        data.map(async (d) => {
          const ret = {
            ...d._doc,
          };
          console.log('RET', ret);

          if (d.type === 'AMOUNT') {
            return ret;
          }

          // get keyword detail
          const keywordDetail = await this.keywordModel.findOne({
            _id: d.keyword,
          });
          console.log('keywordDetail', keywordDetail);
          console.log('ret._id', ret._id);

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
      console.log('let data', data);

      console.log(`REDIS|Load BID ${bidId} from Database|${Date.now() - now}`);

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
      }

      return data;
    }
  }

  private setMsisdn(
    orderType: string,
    purchaseMode: string,
    infos: any,
  ): string | null {
    let msisdn = null;
    const PURCHASE_MODES_USING_SUBSCRIBER_ID = ['GIFT', 'GIFT_ID'];

    if (orderType === this.REN_ORDER_TYPE) {
      msisdn = PURCHASE_MODES_USING_SUBSCRIBER_ID.includes(purchaseMode)
        ? infos?.subscriber_id?.string
        : infos?.service_id_b?.string;
    }

    if (orderType === this.REN_CORP_ORDER_TYPE) {
      msisdn = infos?.service_id_b?.string;
    }

    return msisdn;
  }

  private validationProcess(
    purchaseMode: string,
    paymentMethod: string,
    orderType: string,
    objectLog: object | any,
    startProcess: Date,
  ): boolean {
    const ALLOWED_ORDER_TYPE = [this.REN_ORDER_TYPE, this.REN_CORP_ORDER_TYPE];
    const payloadLog = JSON.stringify(objectLog);

    if (!objectLog.external_product_id) {
      this.loggerGranular(
        payloadLog,
        `Skipped because externalProductId is null or undefined (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    if (objectLog.status.toUpperCase() !== 'OK00') {
      this.loggerGranular(
        payloadLog,
        `Skipped because status !== OK00 (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    if (this.NOT_ALLOWED_PURCHASE_MODE.includes(purchaseMode)) {
      this.loggerGranular(
        payloadLog,
        `Skipped because purchase mode === INJECT (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    if (this.NOT_ALLOWED_PAYMENT_METHOD.includes(paymentMethod)) {
      this.loggerGranular(
        payloadLog,
        `Skipped because status === LOAN || NOCHARGE (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    if (!ALLOWED_ORDER_TYPE.includes(orderType)) {
      this.loggerGranular(
        payloadLog,
        `Skipped because orderType is invalid (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    const identifierCheck = checkCustomerIdentifier(objectLog.msisdn);

    if (identifierCheck.type !== FmcIdenfitiferType.MSISDN) {
      this.loggerGranular(
        payloadLog,
        `Skipped MSISDN Is Indihome (Payload: ${payloadLog})`,
        'error',
        startProcess,
        HttpStatus.EXPECTATION_FAILED,
      );
      return false;
    }

    return true;
  }

  private async injectCore(
    earningDto: InjectCorePayloadDto,
    objectLog: any,
    startProcess: Date,
  ): Promise<void> {
    earningDto.transaction_no = this.transactionOptional.getTracingId(
      { msisdn: earningDto.msisdn },
      { trace_custom_code: 'TRX' },
    );

    console.log('earningDto', earningDto);

    const { point, event_code, sp_multiplier } = earningDto;
    const log = {
      ...objectLog,
      trace_id: earningDto.transaction_no,
      keyword_bonus: point,
      event_code,
      spesial_multiplier_value: sp_multiplier,
      step: 'Inject Core',
    };

    await this.pointService.earning(earningDto, objectLog.token);

    this.loggerGranular(
      log,
      `REQUEST DOM : ${JSON.stringify(log)}`,
      'verbose',
      startProcess,
      HttpStatus.OK,
    );
  }

  /**
   *  Check if all bids are expired or not
   */
  private checkAllExpiredBids(bidDatas: any[], submitTime: any): boolean {
    return !bidDatas.some((bid) => {
      const startDate = moment(bid.start_date);
      const endDate = moment(bid.end_date);
      return submitTime.isBetween(startDate, endDate);
    });
  }

  private async validateUniqueOrderId(
    orderId: string,
    payloadLog: string,
    startProcess: Date,
  ): Promise<boolean> {
    try {
      await this.prepaidGranularTrx.create({ order_id: orderId });

      return true;
    } catch (error) {
      console.log('ERROR SAVE TO prepaidGranularTrx', error.message);

      this.loggerGranular(
        payloadLog,
        `Skip duplicate order_id (Message: ${error.message})`,
        'verbose',
        startProcess,
        HttpStatus.BAD_REQUEST,
      );

      return false;
    }
  }
}
