import { FmcIdenfitiferType } from '@gateway/transaction/dtos/point/fmc.member.identifier.type';
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
// import { KeywordService } from '@/keyword/services/keyword.service';
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
import { SlIntegration } from './integration/sl.integration';

const moment = require('moment-timezone');

type redeemParamType = {
  order_id: any;
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
export class PrepaidGranularService {
  // private httpService: HttpService;
  // private urlSL: string;
  // private integration: SlIntegration;
  private trace_id: Types.ObjectId;
  private startDate: Date;
  private msisdn?: string;
  private keyword?: string;

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
    private applicationService: ApplicationService, // @Inject(KeywordService) // private readonly keywordService: KeywordService,

    @Inject(PointService)
    private pointService: PointService,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
  ) {
    // this.integration = integration;
    // this.httpService = httpService;
    // this.urlSL = `${configService.get<string>('application.hostport')}`;
  }

  /**
   * process inject pretpaid granular DOM
   * @param payload
   * @param account
   */

  async domProcess(msg: any, offset, account, token) {
    this.startDate = new Date();
    const NO_EARN_ACCUM_ONLY = 0;
    const EARN_BY_REVENUE = -1;

    const payload = JSON.parse(msg);
    const infos = payload?.infos?.map;
    const channel_id = infos?.channel_id?.string;
    const status = infos?.status?.string;
    const externalProductId = infos?.business_id?.string;
    const channel_transaction_id = infos?.channel_transaction_id?.string;
    const purchaseMode = infos?.purchase_mode?.string;
    const paymentMethod = infos?.payment_method?.string;
    const orderType = infos?.order_type?.string;
    const orderId = infos?.order_id?.string;
    const transactionAmount = infos?.price?.string;
    const offerName = infos?.offer_name?.string ?? '';

    let msisdn = null;

    if (orderType?.toUpperCase() === 'ACT') {
      if (
        purchaseMode?.toUpperCase() === 'GIFT' ||
        purchaseMode?.toUpperCase() === 'GIFT_ID'
      ) {
        msisdn = infos?.subscriber_id?.string;
        this.msisdn = msisdn;
      } else {
        msisdn = infos?.service_id_b?.string;
        this.msisdn = msisdn;
      }
    } else if (orderType?.toUpperCase() === 'ACT_CORP') {
      msisdn = infos?.service_id_b?.string;
      this.msisdn = msisdn;
    } else if (orderType?.toUpperCase() === 'TB') {
      msisdn = infos?.subscriber_id?.string;
      this.msisdn = msisdn;
    }

    const objectLog: any = {
      msisdn: msisdn,
      status: status,
      external_product_id: externalProductId,
      channel_transaction_id: channel_transaction_id,
      transaction_amount: transactionAmount,
      purchase_mode: purchaseMode,
      payment_method: purchaseMode,
      order_type: orderType,
      offset: offset,
      offer_name: offerName,
      token: token,
      order_id: orderId,
    };

    const payloadLog = JSON.stringify(objectLog);

    if (externalProductId == null) {
      // Cek null atau undefined
      return this.loggerGranular(
        payloadLog,
        `Skipped because externalProductId is null or undefined (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    if (status?.toUpperCase() !== 'OK00') {
      return this.loggerGranular(
        payloadLog,
        `Skipped because status !== OK00 (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    const validOrderTypes = ['ACT', 'ACT_CORP', 'TB'];
    if (!validOrderTypes.includes(orderType?.toUpperCase())) {
      return this.loggerGranular(
        payloadLog,
        `Skipped because orderType is invalid (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    const identifierCheck = checkCustomerIdentifier(msisdn);
    if (identifierCheck.type !== FmcIdenfitiferType.MSISDN) {
      return this.loggerGranular(
        payloadLog,
        `Skipped MSISDN Is Indihome (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    if (purchaseMode?.toUpperCase() === 'INJECT') {
      return this.loggerGranular(
        payloadLog,
        `Skipped because status === INJECT (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    if (
      paymentMethod?.toUpperCase() === 'LOAN' ||
      paymentMethod?.toUpperCase() === 'NOCHARGE'
    ) {
      return this.loggerGranular(
        payloadLog,
        `Skipped because status === LOAN || NOCHARGE (Payload: ${payloadLog})`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    // pengecekan unique orderId
    const isUniqueOrderId = await this.validateUniqueOrderId(
      orderId,
      payloadLog,
    );

    console.log('isUniqueOrderId : ', isUniqueOrderId);

    // temporary nft
    // if (!isUniqueOrderId) {
    //   this.loggerGranular(
    //     payloadLog,
    //     `Skip must unique orderId (Payload: ${payloadLog})`,
    //     'verbose',
    //     this.startDate,
    //     HttpStatus.BAD_REQUEST,
    //   );
    //   return;
    // }

    const bidData = await this.getBidDataFromRedis(externalProductId);
    console.log('bidData : ', bidData);
    let is_skipAccum = false;
    const submitTime = moment().utc();

    if (bidData?.length) {
      console.log('bidData?.length : ', bidData?.length);
      if (bidData.length > 1) {
        console.log('kondisi 1 : ', true);
        let isBidValid = false; // Initialize to true

        for (let index = 0; index < bidData.length; index++) {
          const listBid = bidData[index];

          const startDate = moment(listBid.start_date);
          const endDate = moment(listBid.end_date);
          const validDate = submitTime.isBetween(startDate, endDate);

          if (validDate) {
            isBidValid = true; // At least one bid is valid
            break; // Exit loop early since a valid date has been found
          }
        }

        if (isBidValid) {
          console.log('kondisi isBidValid : ', true);
          for (let index = 0; index < bidData.length; index++) {
            const listBid = bidData[index];

            console.log('listBid : ', listBid);

            const startDate = moment(listBid.start_date);
            const endDate = moment(listBid.end_date);
            const validDate = submitTime.isBetween(startDate, endDate);

            if (validDate) {
              const oneBidData = listBid;

              if (oneBidData.type == 'KEYWORD') {
                // step 1
                if (oneBidData.default_earning && !is_skipAccum) {
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_MULTIPLY_TRX_DEFAULT',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-MULTIPLY-TRX-DEFAULT';
                  is_skipAccum = true;
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    Number(transactionAmount),
                    1,
                    event_code,
                    payloadLog,
                    true,
                  );
                } else if (!is_skipAccum) {
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_NO_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-NO-MULTIPLY-TRX';
                  is_skipAccum = true;
                  await this.injectCore(
                    msisdn,
                    Number(NO_EARN_ACCUM_ONLY),
                    Number(transactionAmount),
                    1,
                    event_code,
                    payloadLog,
                    false,
                  );
                }
                console.log('step 1 : ', true);
                // step 2
                // only if keyword is exist
                if (oneBidData?.keyword_name) {
                  console.log(
                    'oneBidData?.bonus_type : ',
                    oneBidData?.bonus_type,
                  );
                  if (oneBidData?.bonus_type == 'loyalty_poin') {
                    if (oneBidData?.tier_multiplier) {
                      const getSystemConfig =
                        await this.systemConfigModel.findOne({
                          param_key: 'REV_MULTIPLY_POINT',
                        });
                      const event_code = getSystemConfig.param_value
                        ? getSystemConfig.param_value.toString()
                        : 'REV-MULTIPLY-POINT';
                      is_skipAccum = true;
                      await this.injectCore(
                        msisdn,
                        Number(oneBidData?.loyalty_poin),
                        -Number(transactionAmount),
                        1,
                        event_code,
                        payloadLog,
                        false,
                      );
                      console.log(
                        'step 2 : ',
                        oneBidData?.bonus_type,
                        oneBidData?.tier_multiplier,
                      );
                      // continue;
                    } else if (!oneBidData?.tier_multiplier) {
                      const param: redeemParamType = {
                        msisdn: msisdn,
                        keyword: oneBidData.keyword_name,
                        token: token,
                        account: account,
                        path: '/v2/redeem',
                        channel_id: channel_id,
                        business_id: externalProductId,
                        order_id: orderId,
                        transaction_source: 'PREPAID-GRANULAR',
                        channel_transaction_id: channel_transaction_id,
                      };

                      console.log(
                        'step 2 : ',
                        oneBidData?.bonus_type,
                        oneBidData?.tier_multiplier,
                      );
                      await this.redeemProcess(param);
                      // continue;
                    } else {
                      this.loggerGranular(
                        payloadLog,
                        `Skip because oneBidData?.bonus_type not valid (Payload: ${payloadLog})`,
                        'verbose',
                        this.startDate,
                        HttpStatus.BAD_REQUEST,
                      );
                      console.log(
                        'step 2 : ',
                        'Skip because oneBidData?.bonus_type',
                      );
                      // continue;
                    }
                  } else {
                    const param: redeemParamType = {
                      msisdn: msisdn,
                      keyword: oneBidData.keyword_name,
                      token: token,
                      account: account,
                      path: '/v2/redeem',
                      channel_id: channel_id,
                      business_id: externalProductId,
                      order_id: orderId,
                      transaction_source: 'PREPAID-GRANULAR',
                      channel_transaction_id: channel_transaction_id,
                    };

                    console.log('step 2 : ', oneBidData?.bonus_type);
                    await this.redeemProcess(param);
                    // continue;
                  }
                } else {
                  this.loggerGranular(
                    payloadLog,
                    `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
                    'verbose',
                    this.startDate,
                    HttpStatus.BAD_REQUEST,
                  );
                  console.log('step 2 : ', 'Skip because keyword');
                  // continue;
                }
              } else if (oneBidData.type == 'AMOUNT') {
                // step 1
                if (oneBidData.default_earning && !is_skipAccum) {
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_MULTIPLY_TRX_DEFAULT',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-MULTIPLY-TRX-DEFAULT';
                  is_skipAccum = true;
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    Number(transactionAmount),
                    1,
                    event_code,
                    payloadLog,
                    true,
                  );
                } else if (!is_skipAccum) {
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-MULTIPLY-TRX';
                  is_skipAccum = true;
                  await this.injectCore(
                    msisdn,
                    Number(NO_EARN_ACCUM_ONLY),
                    Number(transactionAmount),
                    1,
                    event_code,
                    payloadLog,
                    false,
                  );
                }
                // step 2
                if (
                  oneBidData.tier_multiplier &&
                  oneBidData.special_multiplier
                ) {
                  // event_code WITH earning rule
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-MULTIPLY-TRX';
                  const amount = -Number(transactionAmount);
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    amount,
                    oneBidData.special_multiplier_value,
                    event_code,
                    payloadLog,
                    false,
                  );
                  // continue;
                } else if (
                  oneBidData.tier_multiplier &&
                  !oneBidData.special_multiplier
                ) {
                  // event_code WITH earning rule
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-MULTIPLY-TRX';
                  const amount = -Number(transactionAmount);
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    amount,
                    1,
                    event_code,
                    payloadLog,
                    false,
                  );
                  // continue;
                } else if (
                  !oneBidData.tier_multiplier &&
                  oneBidData.special_multiplier
                ) {
                  // event_code WITHOUT earning rule
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_NO_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-NO-MULTIPLY-TRX';
                  const amount = -Number(transactionAmount);
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    amount,
                    oneBidData.special_multiplier_value,
                    event_code,
                    payloadLog,
                    false,
                  );
                  // continue;
                } else if (
                  !oneBidData.tier_multiplier &&
                  !oneBidData.special_multiplier
                ) {
                  // event_code WITHOUT earning rule
                  const getSystemConfig = await this.systemConfigModel.findOne({
                    param_key: 'REV_NO_MULTIPLY_TRX',
                  });
                  const event_code = getSystemConfig.param_value
                    ? getSystemConfig.param_value.toString()
                    : 'REV-NO-MULTIPLY-TRX';
                  const amount = -Number(transactionAmount);
                  await this.injectCore(
                    msisdn,
                    Number(EARN_BY_REVENUE),
                    amount,
                    1,
                    event_code,
                    payloadLog,
                    false,
                  );
                  // continue;
                }
              } else {
                this.loggerGranular(
                  payloadLog,
                  `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
                  'verbose',
                  this.startDate,
                  HttpStatus.BAD_REQUEST,
                );
                // continue;
              }
            } else {
              this.loggerGranular(
                payloadLog,
                `Skip because validDate not required (Payload: ${payloadLog})`,
                'verbose',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
              // continue;
            }
          }
        } else {
          console.log('kondisi isBidValid : ', false);
          const getSystemConfig = await this.systemConfigModel.findOne({
            param_key: 'REV_MULTIPLY_TRX_DEFAULT',
          });
          const event_code = getSystemConfig.param_value
            ? getSystemConfig.param_value.toString()
            : 'REV-MULTIPLY-TRX-DEFAULT';
          is_skipAccum = true;
          await this.injectCore(
            msisdn,
            Number(EARN_BY_REVENUE),
            Number(transactionAmount),
            1,
            event_code,
            payloadLog,
            true,
          );
        }
      } else {
        console.log('kondisi 2 : ', true);
        for (let index = 0; index < bidData.length; index++) {
          const listBid = bidData[index];

          console.log('listBid kondisi 2: ', listBid);

          const startDate = moment(listBid.start_date);
          const endDate = moment(listBid.end_date);
          const validDate = submitTime.isBetween(startDate, endDate);

          if (validDate) {
            const oneBidData = listBid;

            if (oneBidData.type == 'KEYWORD') {
              // step 1
              if (oneBidData.default_earning && !is_skipAccum) {
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_MULTIPLY_TRX_DEFAULT',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-MULTIPLY-TRX-DEFAULT';
                is_skipAccum = true;
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  Number(transactionAmount),
                  1,
                  event_code,
                  payloadLog,
                  true,
                );
              } else if (!is_skipAccum) {
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_NO_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-NO-MULTIPLY-TRX';
                is_skipAccum = true;
                await this.injectCore(
                  msisdn,
                  Number(NO_EARN_ACCUM_ONLY),
                  Number(transactionAmount),
                  1,
                  event_code,
                  payloadLog,
                  false,
                );
              }
              // step 2
              // only if keyword is exist
              if (oneBidData?.keyword_name) {
                console.log(
                  'oneBidData?.bonus_type : ',
                  oneBidData?.bonus_type,
                );
                if (oneBidData?.bonus_type == 'loyalty_poin') {
                  if (oneBidData?.tier_multiplier) {
                    const getSystemConfig =
                      await this.systemConfigModel.findOne({
                        param_key: 'REV_MULTIPLY_POINT',
                      });
                    const event_code = getSystemConfig.param_value
                      ? getSystemConfig.param_value.toString()
                      : 'REV-MULTIPLY-POINT';
                    is_skipAccum = true;
                    await this.injectCore(
                      msisdn,
                      Number(oneBidData?.loyalty_poin),
                      -Number(transactionAmount),
                      1,
                      event_code,
                      payloadLog,
                      false,
                    );
                    // continue;
                  } else if (!oneBidData?.tier_multiplier) {
                    const param: redeemParamType = {
                      msisdn: msisdn,
                      keyword: oneBidData.keyword_name,
                      token: token,
                      account: account,
                      path: '/v2/redeem',
                      channel_id: channel_id,
                      business_id: externalProductId,
                      order_id: orderId,
                      transaction_source: 'PREPAID-GRANULAR',
                      channel_transaction_id: channel_transaction_id,
                    };

                    await this.redeemProcess(param);
                    // continue;
                  } else {
                    this.loggerGranular(
                      payloadLog,
                      `Skip because oneBidData?.bonus_type not valid (Payload: ${payloadLog})`,
                      'verbose',
                      this.startDate,
                      HttpStatus.BAD_REQUEST,
                    );
                    // continue;
                  }
                } else {
                  const param: redeemParamType = {
                    msisdn: msisdn,
                    keyword: oneBidData.keyword_name,
                    token: token,
                    account: account,
                    path: '/v2/redeem',
                    channel_id: channel_id,
                    business_id: externalProductId,
                    order_id: orderId,
                    transaction_source: 'PREPAID-GRANULAR',
                    channel_transaction_id: channel_transaction_id,
                  };

                  await this.redeemProcess(param);
                  // continue;
                }
              } else {
                this.loggerGranular(
                  payloadLog,
                  `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
                  'verbose',
                  this.startDate,
                  HttpStatus.BAD_REQUEST,
                );
                // continue;
              }
            } else if (oneBidData.type == 'AMOUNT') {
              // step 1
              if (oneBidData.default_earning && !is_skipAccum) {
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_MULTIPLY_TRX_DEFAULT',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-MULTIPLY-TRX-DEFAULT';
                is_skipAccum = true;
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  Number(transactionAmount),
                  1,
                  event_code,
                  payloadLog,
                  true,
                );
              } else if (!is_skipAccum) {
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-MULTIPLY-TRX';
                is_skipAccum = true;
                await this.injectCore(
                  msisdn,
                  Number(NO_EARN_ACCUM_ONLY),
                  Number(transactionAmount),
                  1,
                  event_code,
                  payloadLog,
                  false,
                );
              }
              // step 2
              if (oneBidData.tier_multiplier && oneBidData.special_multiplier) {
                // event_code WITH earning rule
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-MULTIPLY-TRX';
                const amount = -Number(transactionAmount);
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  amount,
                  oneBidData.special_multiplier_value,
                  event_code,
                  payloadLog,
                  false,
                );
                // continue;
              } else if (
                oneBidData.tier_multiplier &&
                !oneBidData.special_multiplier
              ) {
                // event_code WITH earning rule
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-MULTIPLY-TRX';
                const amount = -Number(transactionAmount);
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  amount,
                  1,
                  event_code,
                  payloadLog,
                  false,
                );
                // continue;
              } else if (
                !oneBidData.tier_multiplier &&
                oneBidData.special_multiplier
              ) {
                // event_code WITHOUT earning rule
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_NO_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-NO-MULTIPLY-TRX';
                const amount = -Number(transactionAmount);
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  amount,
                  oneBidData.special_multiplier_value,
                  event_code,
                  payloadLog,
                  false,
                );
                // continue;
              } else if (
                !oneBidData.tier_multiplier &&
                !oneBidData.special_multiplier
              ) {
                // event_code WITHOUT earning rule
                const getSystemConfig = await this.systemConfigModel.findOne({
                  param_key: 'REV_NO_MULTIPLY_TRX',
                });
                const event_code = getSystemConfig.param_value
                  ? getSystemConfig.param_value.toString()
                  : 'REV-NO-MULTIPLY-TRX';
                const amount = -Number(transactionAmount);
                await this.injectCore(
                  msisdn,
                  Number(EARN_BY_REVENUE),
                  amount,
                  1,
                  event_code,
                  payloadLog,
                  false,
                );
                continue;
              }
            } else {
              this.loggerGranular(
                payloadLog,
                `Skip because keyword name is null or keyword is not found (Payload: ${payloadLog})`,
                'verbose',
                this.startDate,
                HttpStatus.BAD_REQUEST,
              );
              // continue;
            }
          } else {
            const getSystemConfig = await this.systemConfigModel.findOne({
              param_key: 'REV_MULTIPLY_TRX_DEFAULT',
            });
            const event_code = getSystemConfig.param_value
              ? getSystemConfig.param_value.toString()
              : 'REV-MULTIPLY-TRX-DEFAULT';
            is_skipAccum = true;
            await this.injectCore(
              msisdn,
              Number(EARN_BY_REVENUE),
              Number(transactionAmount),
              1,
              event_code,
              payloadLog,
              true,
            );
            // continue;
          }
        }
      }
    } else {
      console.log('kondisi 3 : ', true);
      const getSystemConfig = await this.systemConfigModel.findOne({
        param_key: 'REV_MULTIPLY_TRX_DEFAULT',
      });
      const event_code = getSystemConfig.param_value
        ? getSystemConfig.param_value.toString()
        : 'REV-MULTIPLY-TRX-DEFAULT';
      is_skipAccum = true;
      await this.injectCore(
        msisdn,
        Number(EARN_BY_REVENUE),
        Number(transactionAmount),
        1,
        event_code,
        payloadLog,
        true,
      );
    }

    // await this.loggerGranular(
    //   payloadLog,
    //   `Skip (Payload: ${payloadLog})`,
    //   'verbose',
    //   this.startDate,
    //   HttpStatus.BAD_REQUEST,
    // );
  }

  async redeemProcess(param: redeemParamType) {
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
        'PRIORITY_PREPAID_GRANULAR',
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
      return this.loggerGranular(
        param,
        'Error redeem' + error,
        'verbose',
        this.startDate,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async return_res(response) {
    return this.loggerGranular(
      response,
      `Redeem Success (Trx_id: ${response?.payload?.trace_id})`,
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );

    /*
    if (response.code === 'S00000') {
      const data = response.payload;
      const rowData = new this.prepaidGranularLog({
        msisdn: this.msisdn,
        keyword: this.keyword,
        trace_id: this.trace_id,
        trx_id: response?.payload?.trace_id,
        transaction_name: PrepaidGranularTransactionEnum.REDEEM,
        status: PrepaidGranularLogEnum.SUCCESS,
        payload: data,
      });
      await rowData
        .save()
        .then(() => {
          return this.loggerGranular(
            response,
            `Redeem Success (Trx_id: ${response?.payload?.trace_id})`,
            'verbose',
            this.startDate,
            HttpStatus.OK,
          );
        })
        .catch((error) => {
          return this.loggerGranular(
            response,
            error,
            'error',
            this.startDate,
            HttpStatus.EXPECTATION_FAILED,
          );
        });
    } else {
      const rowData = new this.prepaidGranularLog({
        msisdn: this.msisdn,
        keyword: this.keyword,
        trace_id: this.trace_id,
        trx_id: response?.payload?.trace_id,
        transaction_name: PrepaidGranularTransactionEnum.REDEEM,
        status: PrepaidGranularLogEnum.FAIL,
        error: response.message,
      });
      await rowData
        .save()
        .then(() => {
          return this.loggerGranular(
            response,
            `Redeem Fail (trx_id: ${response?.payload?.trace_id}))`,
            'verbose',
            this.startDate,
            HttpStatus.OK,
          );
        })
        .catch((error) => {
          return this.loggerGranular(
            response,
            error,
            'error',
            this.startDate,
            HttpStatus.EXPECTATION_FAILED,
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
    // console.log(` ${start.getTime()} ms`);
    // console.log(` ${end.getTime()} ms`);
    // console.log(`check ms = ${end.getTime() - start.getTime()} ms`);
    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.externalProductId,
      config: this.configService,
      taken_time: end.getTime() - start.getTime(),
      statusCode: statusCode,
      payload: {
        service: 'prepaid-granular',
        user_id: payload?.account,
        method: 'kafka',
        url: 'prepaid-granular',
        step: `Prepaid Granular ${payload?.step ?? '-'}`,
        param: payload,
        taken_time: end.getTime() - start.getTime(),
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

      data = await Promise.all(
        data.map(async (d) => {
          const ret = {
            ...d._doc,
          };

          // get keyword detail
          const keywordDetail = await this.keywordModel.findOne({
            _id: d.keyword,
          });

          console.log('keywordDetail : ', keywordDetail);

          // keyword name is null?
          if (!d?.keyword_name) {
            ret.keyword_name = keywordDetail?.eligibility?.name ?? null;
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

          console.log('ret.bonus_type : ', ret.bonus_type);
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

  async injectCore(
    msisdn = null,
    keyword_bonus = null,
    transactionAmount = null,
    spesial_multiplier_value = 1,
    event_code: string,
    payloadLog = null,
    default_earning = false,
  ) {
    const trxId = this.getTracingId(msisdn);
    const mappingCore = {
      locale: 'en-US',
      event_code: event_code,
      transaction_no: trxId,
      channel: 'R1',
      revenue: transactionAmount,
      point: keyword_bonus,
      sp_multiplier: spesial_multiplier_value,
      msisdn: msisdn,
      package_name: JSON.parse(payloadLog)?.offer_name ?? '',
      order_id: JSON.parse(payloadLog)?.order_id ?? '',
      business_id: JSON.parse(payloadLog)?.external_product_id ?? '',
      default_earning: default_earning,
    };
    await this.pointService.earning(mappingCore, payloadLog?.token || '');
    console.log(
      msisdn,
      keyword_bonus,
      transactionAmount,
      spesial_multiplier_value,
      event_code,
      'injectCore',
    );

    const log = {
      ...JSON.parse(payloadLog),
      trace_id: trxId,
      keyword_bonus,
      event_code,
      spesial_multiplier_value,
      step: 'Inject Core',
    };

    return this.loggerGranular(
      log,
      `REQUEST DOM : ${JSON.stringify(log)})`,
      'verbose',
      this.startDate,
      HttpStatus.OK,
    );
  }

  getTracingId(inputMsisdn: string | null): string {
    const timestamp = new Date();
    const randomNumber = this.generateRandomThreeDigitNumber();
    const msisdnSuffix = this.customSplice(inputMsisdn) ?? randomNumber;

    // Format: TRX_[msisdn suffix][YY][MM][DD][HH][mm][ss][SSS][random]
    return `TRX_${msisdnSuffix}${this.customSplice(
      timestamp.getFullYear(),
      -2,
    )}${this.getCurrentDateFormatted('month')}${this.getCurrentDateFormatted(
      'day',
    )}${this.getCurrentDateFormatted('hours')}${this.getCurrentDateFormatted(
      'minutes',
    )}${this.getCurrentDateFormatted('seconds')}${this.getCurrentDateFormatted(
      'milliseconds',
    )}${randomNumber}`;
  }

  generateRandomThreeDigitNumber() {
    return Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  }

  customSplice(data = null, slice = -3) {
    if (data) {
      const rsl = data.toString().slice(slice);
      return rsl;
    }
    return null;
  }

  getCurrentDateFormatted(format = null) {
    const date = new Date();
    const zona_ = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    const year = zona_.getUTCFullYear();
    const month = (zona_.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = zona_.getUTCDate().toString().padStart(2, '0');
    const hours = zona_.getUTCHours().toString().padStart(2, '0');
    const minutes = zona_.getUTCMinutes().toString().padStart(2, '0');
    const seconds = zona_.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = zona_.getUTCMilliseconds().toString().padStart(3, '0');

    switch (format) {
      case 'year':
        return year;
      case 'month':
        return month;
      case 'day':
        return day;
      case 'hours':
        return hours;
      case 'minutes':
        return minutes;
      case 'seconds':
        return seconds;
      case 'milliseconds':
        return milliseconds;
      default:
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }
  }

  private async validateUniqueOrderId(
    orderId: string,
    payloadLog: string,
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
        this.startDate,
        HttpStatus.BAD_REQUEST,
      );

      return false;
    }
  }
}
