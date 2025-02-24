import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { IAccount } from '@utils/logger/transport';
import { error } from 'console';
import { Parser } from 'csv-parse';
import { createReadStream } from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';

import { Account } from '@/account/models/account.model';
import {
  BatchProcessEnum,
  BatchProcessLog,
  BatchProcessLogDocument,
} from '@/application/models/batch.log.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedMSISDN,
  checkCustomerIdentifier,
  formatIndihomeNumberToNonCore,
  formatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { ChannelService } from '@/channel/services/channel.service';
import { CustomerService } from '@/customer/services/customer.service';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  LocationBucket,
  LocationBucketDocument,
} from '@/location/models/location.bucket.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantDocument } from '@/merchant/models/merchant.model';
import { OTPService } from '@/otp/services/otp.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import { RedeemDTO } from '@/transaction/dtos/redeem/redeem.dto';
import { VoucherBatchDto } from '@/transaction/dtos/voucher/voucher.batch.dto';
import { VoucherDTO } from '@/transaction/dtos/voucher/voucher.dto';
import { InjectPoint } from '@/transaction/models/point/inject.point.model';
import {
  CheckRedeem,
  CheckRedeemDocument,
} from '@/transaction/models/redeem/check.redeem.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { DonationService } from '@/transaction/services/donation/donation.service';
import { PointService } from '@/transaction/services/point/point.service';
import { VoteService } from '@/vote/services/vote.service';

import { keyword } from '../../../__tests__/mocks/redeem/deduct';
import {
  ChannelConstant,
  MaxModeConstant,
} from '../../gateway/src/constants/constant';
import { IAuctionNotification } from '../interfaces/interface';

@Injectable()
export class RedeemService {
  private httpService: HttpService;
  private lovService: LovService;
  private keywordService: KeywordService;
  private programService: ProgramServiceV2;
  private pointService: PointService;
  private donationService: DonationService;
  private voteService: VoteService;
  private channelService: ChannelService;
  private notifContentService: NotificationContentService;

  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private coupon_prefix: string;
  private coupon_product: string;
  private product: string;

  // NGRS
  private esbNgrsEncryptionSecret: string;
  private esbNgrsRechargeOrgCode: string;
  private esbNgrsRechargeChannel: string;
  private esbNgrsRechargeStockType: string;
  private esbNgrsMerchantThirdPartyId: string;
  private esbNgrsMerchantThirdPartyPassword: string;
  private esbNgrsMerchantDeliveryChannel: string;

  // TELCO PREPAID
  private esbTelcoPrePaidOrderType: string;
  private esbTelcoPrePaidPurchaseMode: string;
  private esbTelcoPrePaidPaymentMethod: string;
  private esbTelcoPrePaidPaymentName: string;
  private esbTelcoPrePaidSubscription: string;
  private esbTelcoPrePaidCallbackUrl: string;
  private esbTelcoPrePaidVersion: string;

  // TELCO POSTPAID
  private esbTelcoPostPaidOrderType: string;
  private esbTelcoPostPaidPurchaseMode: string;
  private esbTelcoPostPaidPaymentMethod: string;
  private esbTelcoPostPaidPaymentName: string;
  private esbTelcoPostPaidSubscription: string;
  private esbTelcoPostPaidCallbackUrl: string;
  private esbTelcoPostPaidVersion: string;

  // SET GLOBAL VAR
  private transaction_date: string;

  constructor(
    @InjectModel(BatchProcessLog.name)
    private batchProcessLog: Model<BatchProcessLogDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,

    @InjectModel(CheckRedeem.name)
    private checkRedeem: Model<CheckRedeemDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(LocationBucket.name)
    private locationBucketModel: Model<LocationBucketDocument>,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    private customerService: CustomerService,
    httpService: HttpService,
    configService: ConfigService,
    programService: ProgramServiceV2,
    keywordService: KeywordService,
    lovService: LovService,
    pointService: PointService,
    donationService: DonationService,
    voteService: VoteService,
    channelService: ChannelService,
    notifContentService: NotificationContentService,
    private transactionOptional: TransactionOptionalService,
    private applicationService: ApplicationService,
    private otpService: OTPService,
    private callApiConfigService: CallApiConfigService,

    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeduct: ClientKafka,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly clientTransactionMaster: ClientKafka,

    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibilityHigh: ClientKafka,

    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibilityLow: ClientKafka,

    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibility: ClientKafka,

    @Inject('VOID_PRODUCER')
    private readonly clientVoid: ClientKafka,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly clientNotification: ClientKafka,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    this.httpService = httpService;
    this.keywordService = keywordService;
    this.programService = programService;
    this.lovService = lovService;
    this.pointService = pointService;
    this.donationService = donationService;
    this.voteService = voteService;
    this.channelService = channelService;
    this.notifContentService = notifContentService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.coupon_prefix = `${configService.get<string>(
      'core-backend.coupon_prefix.id',
    )}`;
    this.coupon_product = `${configService.get<string>(
      'core-backend.coupon_product.id',
    )}`;
    this.product = `${configService.get<string>('core-backend.product.id')}`;

    // NGRS
    this.esbNgrsEncryptionSecret = `${configService.get<string>(
      'esb-backend.client.encryption_secret',
    )}`;
    this.esbNgrsRechargeOrgCode = `${configService.get<string>(
      'esb-backend.ngrs.recharge.organization_code',
    )}`;
    this.esbNgrsRechargeChannel = `${configService.get<string>(
      'esb-backend.ngrs.recharge.channel',
    )}`;
    this.esbNgrsRechargeStockType = `${configService.get<string>(
      'esb-backend.ngrs.recharge.stock_type',
    )}`;
    this.esbNgrsMerchantThirdPartyId = `${configService.get<string>(
      'esb-backend.ngrs.merchant.third_party_id',
    )}`;
    this.esbNgrsMerchantThirdPartyPassword = `${configService.get<string>(
      'esb-backend.ngrs.merchant.third_party_password',
    )}`;
    this.esbNgrsMerchantDeliveryChannel = `${configService.get<string>(
      'esb-backend.ngrs.merchant.delivery_channel',
    )}`;

    // TELCO PREPAID
    this.esbTelcoPrePaidOrderType = `${configService.get<string>(
      'esb-backend.telco.prepaid.order_type',
    )}`;
    this.esbTelcoPrePaidPurchaseMode = `${configService.get<string>(
      'esb-backend.telco.prepaid.purchase_mode',
    )}`;
    this.esbTelcoPrePaidPaymentMethod = `${configService.get<string>(
      'esb-backend.telco.prepaid.payment_method',
    )}`;
    this.esbTelcoPrePaidPaymentName = `${configService.get<string>(
      'esb-backend.telco.prepaid.payment_name',
    )}`;
    this.esbTelcoPrePaidSubscription = `${configService.get<string>(
      'esb-backend.telco.prepaid.subscription',
    )}`;
    this.esbTelcoPrePaidCallbackUrl = `${configService.get<string>(
      'esb-backend.telco.prepaid.callback_url',
    )}`;
    this.esbTelcoPrePaidVersion = `${configService.get<string>(
      'esb-backend.telco.prepaid.version',
    )}`;

    // TELCO POSTPAID
    this.esbTelcoPostPaidOrderType = `${configService.get<string>(
      'esb-backend.telco.postpaid.order_type',
    )}`;
    this.esbTelcoPostPaidPurchaseMode = `${configService.get<string>(
      'esb-backend.telco.postpaid.purchase_mode',
    )}`;
    this.esbTelcoPostPaidPaymentMethod = `${configService.get<string>(
      'esb-backend.telco.postpaid.payment_method',
    )}`;
    this.esbTelcoPostPaidPaymentName = `${configService.get<string>(
      'esb-backend.telco.postpaid.payment_name',
    )}`;
    this.esbTelcoPostPaidSubscription = `${configService.get<string>(
      'esb-backend.telco.postpaid.subscription',
    )}`;
    this.esbTelcoPostPaidCallbackUrl = `${configService.get<string>(
      'esb-backend.telco.postpaid.callback_url',
    )}`;
    this.esbTelcoPostPaidVersion = `${configService.get<string>(
      'esb-backend.telco.postpaid.version',
    )}`;
  }

  private isCharOrNumber(str) {
    return /^[A-Za-z0-9]*$/g.test(str);
  }

  private validKeyword(payload, key, index = -1) {
    const now = new Date();
    const keyword = key.trim();

    this.customLogger(payload, now, `[${index}] Checking: ${keyword}`);

    // max length
    if (keyword.length > 20) {
      this.customLogger(
        payload,
        now,
        `[${index}] This keyword length is more than 20! Len ${keyword.length}`,
      );

      return false;
    }

    // space
    if (keyword.includes(' ')) {
      const keywordSplit = keyword.split(' ');
      if (keywordSplit.length === 2) {
        if (
          keywordSplit[0] === 'YA' &&
          !Number.isNaN(Number(keywordSplit[1]))
        ) {
          return true;
        }
      }

      this.customLogger(payload, now, `[${index}] This keyword contain space!`);
      return false;
    }

    // contain 2 keyword,eg: KEYWORD-100 -> 100 total redeem
    if (keyword.includes('-')) {
      this.customLogger(
        payload,
        now,
        `[${index}] This keyword contain '-', splitting`,
      );

      const keywords = keyword.split('-');

      // contain 2 or more dash, eg: KEYWORD-100-100
      if (keywords.length >= 3) {
        this.customLogger(
          payload,
          now,
          `[${index}] This keyword split is more than 2! Split len ${keywords.length}`,
        );

        return false;
      }

      // check all keyword from split
      const keywordsRet = keywords.map((key, index) => {
        return this.validKeyword(payload, key, index);
      });

      return keywordsRet.every(Boolean);
    }

    // allow char & number only (first keyword)
    if (index == -1) {
      // all number
      if (!isNaN(keyword)) {
        this.customLogger(
          payload,
          now,
          `[${index}] First keyword contain all numbers!`,
        );

        return false;
      }

      // symbol
      if (!this.isCharOrNumber(keyword)) {
        this.customLogger(
          payload,
          now,
          `[${index}] This keyword contain symbol!`,
        );

        return false;
      }
    } else {
      if (index == 0) {
        // all number
        if (!isNaN(keyword)) {
          this.customLogger(
            payload,
            now,
            `[${index}] First keyword contain all numbers!`,
          );

          return false;
        }
      }

      if (index == 1) {
        if (isNaN(keyword)) {
          this.customLogger(
            payload,
            now,
            `[${index}] Second keyword is not number!`,
          );

          return false;
        }
      }

      // // SECTION HANDLING FOR VOTING
      // const isVote = await this.isValidVoteKeyword(
      //   payload.data,
      //   response.payload,
      // );
      // if (!isVote) {
      //   throw new BadRequestException([
      //     { isNotFound: 'Vote option not found' },
      //   ]);
      // }
      // // END SECTION HANDLING FOR VOTING
    }

    return true;
  }

  private async keywordError(
    origin,
    payload,
    keywordFromBody,
    customErrorCode: NotificationTemplateConfig = null,
  ) {
    const now = Date.now();
    try {
      payload.keyword = {
        eligibility: {
          program_title_expose: keywordFromBody,
        },
        notification: true,
      };

      payload.customer = {
        msisdn: payload?.data?.msisdn,
      };

      if (customErrorCode) {
        payload.notification =
          await this.notifContentService.getNotificationTemplate(
            customErrorCode,
            payload,
          );
      } else {
        payload.notification =
          await this.notifContentService.getNotificationTemplate(
            NotificationTemplateConfig.REDEEM_FAILED_NOTFOUND_KEYWORD,
            payload,
          );
      }

      payload.origin = `${origin}.redeem_fail`; // TODO
      payload.incoming = payload.data;
      payload.tracing_id = payload.transaction_id;
      payload.tracing_master_id = payload.transaction_id;

      await this.clientNotification.emit(
        process.env.KAFKA_NOTIFICATION_TOPIC,
        payload,
      );
      return;
    } catch (e) {
      await this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: payload.transaction_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - now,
        param: payload,
        step: 'Redeem Exception',
        service: 'REDEEM',
        result: {
          msisdn: payload?.data?.msisdn,
          url: 'redeem',
          user_id: new IAccount(payload.account),
          result: {
            message: e.message,
            stack: e.stack,
          },
        },
      });
    }
  }

  customLogger(payload, now, step) {
    this.logger.verbose({
      method: 'kafka',
      statusCode: HttpStatus.OK,
      transaction_id: payload.transaction_id,
      notif_customer: false,
      notif_operation: true,
      taken_time: Date.now() - now,
      param: payload,
      step: step,
      service: 'REDEEM',
      result: {
        msisdn: payload?.data?.msisdn,
        url: 'redeem',
        user_id: new IAccount(payload.account),
      },
    });
  }

  async prepare(payload: any, now: any, additional_param = null) {
    const transaction_date = new Date().toISOString();
    this.transaction_date = transaction_date;

    const startTime = Date.now();
    try {
      let origin = 'redeem';

      // TODO: Temporary fix
      if (payload?.data?.keyword?.trim()?.toUpperCase() == 'POIN') {
        payload.data.keyword = payload.data.keyword.trim().toUpperCase();
      }

      // == START KEYWORD VALIDATION ==, 2024-03-19
      const isValidKeyword = this.validKeyword(
        payload,
        payload.data.keyword.trim(),
      );

      this.customLogger(payload, now, `Is valid keyword? ${isValidKeyword}`);

      if (!isValidKeyword) {
        return await this.keywordError(
          origin,
          payload,
          payload.data.keyword.trim(),
        );
      }
      // == END KEYWORD VALIDATION ==

      // split keyword
      const keywordFromBody = payload.data.keyword.trim().split('-');

      // check if keyword is exists, if not exists, send notification to customer
      const isKeywordExists = await this.keywordService.checkKeywordNameExist(
        keywordFromBody[0],
      );

      let is_keyword_registration = false;
      let is_bulk_redeem_coupon_confirmation_keyword = false;
      let is_bulk_redeem_bonus_approval_keyword = false;
      let is_bulk_redeem_bonus_info_keyword = false;
      let is_bulk_redeem_bonus_check_keyword = false;
      let is_auction_top_bidder = false;
      let is_auction_summary_keyword = false;

      if (!isKeywordExists) {
        // check keyword registration
        is_keyword_registration = await this.is_keyword_registration_check(
          keywordFromBody[0],
        );

        if (!is_keyword_registration) {
          // check coupon confirmation
          is_bulk_redeem_coupon_confirmation_keyword =
            await this.is_bulk_redeem_coupon_confirmation_keyword(
              keywordFromBody[0],
              null,
            );

          if (!is_bulk_redeem_coupon_confirmation_keyword) {
            // check redeem bonus approval
            if (additional_param?.identifier) {
              is_bulk_redeem_bonus_approval_keyword =
                additional_param.identifier.type == FmcIdenfitiferType.MSISDN
                  ? await this.is_bulk_redeem_coupon_approval_keyword(
                      payload.data.keyword,
                      payload.data.msisdn,
                    )
                  : false;
            } else {
              is_bulk_redeem_bonus_approval_keyword =
                await this.is_bulk_redeem_coupon_approval_keyword(
                  payload.data.keyword,
                  payload.data.msisdn,
                );
            }

            this.logger.verbose({
              method: 'kafka',
              statusCode: HttpStatus.OK,
              transaction_id: payload.transaction_id,
              notif_customer: false,
              notif_operation: true,
              taken_time: Date.now() - now,
              param: payload,
              step: `Bulk redeem approval ${payload.data.keyword.trim()}`,
              service: 'REDEEM',
              result: {
                msisdn: payload?.data?.msisdn,
                url: 'redeem',
                user_id: new IAccount(payload.account),
                result: is_bulk_redeem_bonus_approval_keyword,
              },
            });

            if (!is_bulk_redeem_bonus_approval_keyword) {
              // check bonus info keyword
              is_bulk_redeem_bonus_info_keyword =
                await this.is_bulk_redeem_coupon_info_keyword(
                  keywordFromBody[0],
                );

              if (!is_bulk_redeem_bonus_info_keyword) {
                // check bonus check keyword
                is_bulk_redeem_bonus_check_keyword =
                  await this.is_bulk_redeem_coupon_check_keyword(
                    keywordFromBody[0],
                  );

                if (!is_bulk_redeem_bonus_check_keyword) {
                  is_auction_top_bidder = await this.is_auction_top_bidder(
                    keywordFromBody[0],
                  );

                  if (!is_auction_top_bidder) {
                    is_auction_summary_keyword =
                      await this.is_auction_summary_keyword(keywordFromBody[0]);

                    if (!is_auction_summary_keyword) {
                      // keyword not found
                      return await this.keywordError(
                        origin,
                        payload,
                        keywordFromBody[0],
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      // parse total redeem
      if (
        keywordFromBody.length == 2 &&
        !is_bulk_redeem_bonus_approval_keyword
      ) {
        payload.data.total_redeem = Number(keywordFromBody[1]);
      }

      // split main keyword
      payload.data.keyword = keywordFromBody[0];

      // check if keyword is exists, if not exists, send notification to customer

      this.customLogger(payload, now, `Is keyword exist? ${isKeywordExists}`);
      this.customLogger(
        payload,
        now,
        `Is Bulk Redeem Bonus Check Keyword? ${is_bulk_redeem_bonus_check_keyword}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Bulk Redeem Bonus Info Keyword? ${is_bulk_redeem_bonus_info_keyword}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Bulk Redeem Coupon Confirmation Keyword? ${is_bulk_redeem_coupon_confirmation_keyword}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Bulk Redeem Bonus Approval Keyword? ${is_bulk_redeem_bonus_approval_keyword}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Registration Keyword? ${is_keyword_registration}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Auctuon Top Bidder? ${is_auction_top_bidder}`,
      );
      this.customLogger(
        payload,
        now,
        `Is Auctuon Summary Keyword? ${is_auction_summary_keyword}`,
      );

      // === START BONUS VALIDATION, 2024-07-25 ===
      let is_invalid_keyword = false;

      try {
        const keywordProfile = await this.keywordService.getkeywordProfile(
          payload.data.keyword,
          true,
        );

        const keywordType = keywordProfile?.eligibility?.poin_value;
        const bonusType = keywordProfile?.bonus?.[0]?.bonus_type;
        const bonusFlexibility = keywordProfile?.bonus?.[0]?.flexibility;
        const bonusQuantity = keywordProfile?.bonus?.[0]?.bonus_quantity;

        // fixed multiple validation
        if (keywordType == 'Fixed Multiple' && bonusFlexibility == 'Flexible') {
          is_invalid_keyword = true;
        }
      } catch (err) {
        this.customLogger(
          payload,
          now,
          `An error occured! ${JSON.stringify(err)}`,
        );

        return await this.keywordError(
          origin,
          payload,
          payload.data.keyword.trim(),
          NotificationTemplateConfig.REDEEM_FAILED_GENERAL,
        );
      }

      this.customLogger(
        payload,
        now,
        `Is INVALID Keyword (Not Applicable)? ${is_invalid_keyword}`,
      );

      // KEYWORD IS INVALID
      if (is_invalid_keyword) {
        return await this.keywordError(
          origin,
          payload,
          payload.data.keyword.trim(),
          NotificationTemplateConfig.REDEEM_FAILED_INVALID_KEYWORD,
        );
      }
      // === END BONUS VALIDATION, 2024-07-25 ===

      return await this.redeem_v2(
        payload.data,
        payload.transaction_id,
        payload.account,
        payload.token,
      )
        .then(async (response: any) => {
          if (
            response.payload.custom_origin &&
            response.payload.custom_origin !== ''
          ) {
            origin = response.payload.custom_origin;
          }

          if (is_bulk_redeem_coupon_confirmation_keyword) {
            await this.process_bulk_redeem_coupon_confirmation_keyword(
              payload.data,
              payload.account,
              payload.token,
              payload.transaction_id,
            )
              .then((res) => {
                response = res;
                response.transaction_id = payload.transaction_id;
                origin = 'redeem2.bulk_redeem_coupon_confirmation';

                // return res;
              })
              .catch((e) => {
                return e;
              });
          } else if (is_bulk_redeem_bonus_approval_keyword) {
            this.customLogger(payload, now, `Processing bulk approval`);
            const keywordSplit = payload.data.keyword.trim().split(' ');
            const otp = keywordSplit[1];
            await this.process_bulk_redeem_coupon_approval_keyword(
              payload.data,
              payload.transaction_id,
              response,
              payload.account,
              payload.token,
              otp,
              payload,
            )
              .then((res) => {
                response = res;
                response.transaction_id = payload.transaction_id;
                console.log(res.payload.keyword.eligibility);
                console.log(res.payload.redeem);
                // return res;
              })
              .catch((e) => {
                console.log('Approval bulk error');
                console.log(JSON.stringify(e));
                return e;
              });
          } else if (is_bulk_redeem_bonus_info_keyword) {
            await this.process_bulk_redeem_coupon_info_keyword(
              payload.data,
              payload.transaction_id,
              response,
              payload.account,
              payload.token,
            )
              .then((res) => {
                response = res;
                response.transaction_id = payload.transaction_id;
                console.log(res.payload.keyword.eligibility);
                console.log(res.payload.redeem);
                // return res;
              })
              .catch((e) => {
                console.log('Info bulk error');
                console.log(JSON.stringify(e));
                return e;
              });
          } else if (is_bulk_redeem_bonus_check_keyword) {
            await this.process_bulk_redeem_coupon_check_keyword(
              payload.data,
              payload.transaction_id,
              response,
              payload.account,
              payload.token,
            )
              .then((res) => {
                response = res;
                response.transaction_id = payload.transaction_id;
                console.log(res.payload.keyword.eligibility);
                console.log(res.payload.redeem);
                // return res;
              })
              .catch((e) => {
                console.log('Info bulk error');
                console.log(JSON.stringify(e));
                return e;
              });
          } else if (is_auction_top_bidder || is_auction_summary_keyword) {
            const notifTemplateType = is_auction_top_bidder
              ? NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_TOP_BIDDER
              : NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_SUMMARY_KEYWORD;

            this.processAuctionNotification(
              {
                payload,
                data: payload.data,
                keyword_name: payload.data.keyword,
                origin: 'redeem2.notificationkeyword',
                token: payload.token,
              },
              notifTemplateType,
            );
          } else {
            // Else of defined keyword condition
            // END OF SECTION HANDLING REDEEM BULK COUPON
            const data = payload.data;
            const account: IAccount = payload.account;
            this.emit_process(response, {
              path: payload.path,
              token: payload.token,
              data,
              account,
              applicationService: this.applicationService,
              client: this.clientEligibility,
              origin: origin,
              bulk_keyword: response?.payload?.keyword_bulk,
              priority: payload?.keyword_priority,
            });
          }

          return response;
        })
        .catch(async (e) => {
          await this.logger.error({
            method: 'kafka',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            transaction_id: payload.transaction_id,
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - startTime,
            param: payload,
            step: `[redeem_v2] An error occured! Error: ${e?.message}`,
            service: 'REDEEM',
            result: {
              msisdn: payload?.data?.msisdn,
              url: 'redeem',
              user_id: new IAccount(payload.account),
              result: {
                message: e?.message,
                stack: e?.stack,
              },
            },
          });

          // handleException({
          //   code: HttpStatusTransaction.ERR_CONTENT_DATA_INVALID,
          //   message: e,
          //   transaction_classify: 'REDEEM',
          //   trace_custom_code: 'RDM',
          //   payload: payload,
          // } satisfies GlobalTransactionResponse);
        });
    } catch (error) {
      console.log(error);
      await this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: payload.transaction_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - startTime,
        param: payload,
        step: 'Exception',
        service: 'REDEEM',
        result: {
          msisdn: payload?.data?.msisdn,
          url: 'redeem',
          user_id: new IAccount(payload.account),
          result: {
            message: error.message,
            stack: error.stack,
          },
        },
      });

      // handleException({
      //   code: HttpStatusTransaction.ERR_CONTENT_DATA_INVALID,
      //   message: error,
      //   transaction_classify: 'REDEEM',
      //   trace_custom_code: 'RDM',
      //   payload: payload,
      // } satisfies GlobalTransactionResponse);
    }
  }

  async redeem(
    request: any,
    trace_id: string,
    account: Account,
    token = '',
  ): Promise<GlobalTransactionResponse> {
    const now = Date.now();
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    // const trace_id = this.transactionOptional.getTracingId(request, response);

    const newData = new this.redeemModel({
      ...request,
      tracing_id: trace_id.replace('TRX', 'RDM'),
      master_id: trace_id,
      created_by: account,
    });

    return await newData
      .save()
      .catch((e: BadRequestException) => {
        this.logger.error({
          method: 'kafka',
          statusCode: HttpStatus.BAD_REQUEST,
          transaction_id: trace_id.replace('TRX', 'RDM'),
          notif_customer: false,
          notif_operation: true,
          taken_time: Date.now() - now,
          param: {
            request: request,
            trace_id: trace_id,
            account: account,
            token: token,
          },
          step: e.message,
          service: 'REDEEM',
          result: e,
        });
      })
      .then(async (redeem) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.payload = {
          trace_id: trace_id,
          redeem: redeem,
        };

        // Eligibility check consider to be pass waiting for core subscriber profile module
        return await this.keywordService
          .findKeywordByName(request.keyword)
          .then(async (keyConf) => {
            if (keyConf) {
              // Kafka Register job to deduct
              // If bonus type is auction should register to specific consumer with high prior
              // Deduct point by what wallet?

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              //Prepare for deduction
              const program = await this.programService.findProgramById(
                keyConf.eligibility.program_id,
              );
              const getRewardId = async () => {
                let additional = '';
                const data = {
                  reward_item_id: '',
                  reward_instance_id: '',
                  status: false,
                };
                const lov = await this.lovService.getLovData(
                  program.point_type.toString(),
                );

                additional = lov.additional ? lov.additional.split('|') : false;

                if (lov && additional) {
                  data.reward_item_id = additional[1];
                  data.reward_instance_id = additional[0];
                  data.status = true;
                }
                return data;
              };
              const coreRequest = await this.pointService
                .customer_point_balance(
                  request.msisdn,
                  new ViewPointQueryDTO(),
                  token,
                )
                .then(async (e: any) => {
                  const member_core_id = e.payload.core_id;
                  const __v = e.payload.core_v;
                  const reward_item_id = (await getRewardId()).reward_item_id;

                  let amount = request.total_redeem;
                  if (typeof request.total_redeem == 'undefined') {
                    amount = -1;
                  } else if (request.total_redeem === 0) {
                    amount = 0;
                  }

                  return {
                    locale: request.locale, //"id-ID"
                    type: 'reward',
                    channel: 'Application',
                    reward_item_id: reward_item_id,
                    amount: amount,
                    member_id: member_core_id,
                    realm_id: this.realm,
                    branch_id: this.branch,
                    merchant_id: this.merchant,
                    __v: __v,
                  };
                });

              let customer = {};
              if (allowedMSISDN(request.msisdn)) {
                const reformatMsisdn = formatMsisdnCore(request.msisdn);
                customer = await this.customerService
                  .getCustomerByMSISDN(reformatMsisdn, token)
                  .then(async (customerDetail) => customerDetail);
              }

              // campaign
              let campaign = {};
              const hasRedeemNotification = keyConf?.notification?.find(
                (notif) =>
                  notif?.code_identifier_detail?.set_value ===
                  'Redeem Campaign', // 'Keyword Verification',
              );
              if (hasRedeemNotification) {
                campaign = {
                  template:
                    hasRedeemNotification?.code_identifier_detail
                      ?.notification_content,
                };
              }

              response.message = 'Success';
              response.payload = {
                trace_id: trace_id,
                core: coreRequest,
                keyword: keyConf,
                program: await this.programService.findProgramById(
                  keyConf.eligibility.program_id,
                ),
                customer: customer,
                redeem: redeem,
                campaign: campaign,
              };
            } else {
              response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
              response.message = 'Keyword is not found';
              response.transaction_classify = 'REDEEM';
              response.trace_custom_code = 'RDM';
              response.payload = {
                core: '',
                reward: '',
                trace_id: trace_id,
                redeem: redeem,
              };
            }
            return response;
          })
          .catch((e) => {
            response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
            response.message = e.message;
            response.transaction_classify = 'REDEEM';
            response.trace_custom_code = 'RDM';
            response.payload = {
              core: '',
              reward: '',
              trace_id: trace_id,
              redeem: redeem,
            };
            return response;
          });
      });
  }

  async redeem_v2(
    request: RedeemDTO,
    trace_id: string,
    account: Account,
    token = '',
    custom_origin = '',
  ) {
    // TODO : Enhance this function
    const startTime = Date.now();
    try {
      const now = Date.now();
      const response = new GlobalTransactionResponse();
      response.transaction_classify = 'REDEEM';
      response.trace_custom_code = 'TRX';

      // generate trace_id
      if (trace_id === '') {
        trace_id = this.transactionOptional.getTracingId(request, response);
      }

      // Add field parent_master_id
      let parent_transaction_id = trace_id;
      if (request?.additional_param) {
        const parse_additional_param: any = request.additional_param;

        if (parse_additional_param?.parent_transaction_id) {
          parent_transaction_id = parse_additional_param.parent_transaction_id;
        }
      }

      // const trace_id = this.transactionOptional.getTracingId(request, response);

      if (request.total_redeem < 0) {
        response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
        response.message = 'total_redeem cannot be negative';
        response.payload = {
          trace_id: trace_id,
        };
        return response;
      }

      if (request?.total_bonus < 0) {
        response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
        response.message = 'total_bonus cannot be negative';
        response.payload = {
          trace_id: trace_id,
        };
        return response;
      }

      /**
       * Set comment checkTraceIDInjectPoint, take time 11s & for checking unique channel_transaction_id
       */
      // const count = await this.pointService.checkTraceIDInjectPoint(trace_id);
      // if (count == 0) {
      console.log('TraceID found. Preparing data from point service');
      return await this.pointService
        .getSelectedData(request, token, {
          customer: true,
        })
        .then(async (value: any) => {
          //response.code = HttpStatusTransaction.CODE_SUCCESS;
          //           response.message = 'Success';

          // const remark = value?.keyword?.eligibility?.program_title_expose
          //   ? value?.keyword?.eligibility?.program_title_expose
          //   : '';

          // Set merchant_id
          const merchant_id = value?.keyword?.eligibility?.merchant ?? '';

          // Create channel with condition
          const channel = await this.channelService.getChannelMyTelkomsel(
            request.channel_id,
          );
          const channel_id = request.channel_id
            ? channel.status
              ? ChannelConstant.MY_TELKOMSEL
              : request.channel_id
            : '';

          // create remark
          const _eligibility = value?.keyword?.eligibility;

          let program_experience = '';
          const _program_experience =
            _eligibility?.program_experience.toString();
          if (_program_experience) {
            try {
              const lov = await this.lovService.getLovData(
                _program_experience ?? '65003c8c2a42d91119df8eae',
              );
              program_experience = lov.set_value;
            } catch (error) {
              this.logger.error({
                method: 'kafka',
                statusCode: HttpStatus.OK,
                transaction_id: response.payload?.trace_id ?? '',
                notif_customer: false,
                notif_operation: true,
                taken_time: Date.now() - now,
                param: _program_experience ?? '65003c8c2a42d91119df8eae',
                step: `Program_experience not found`,
                service: 'REDEEM',
                result: {
                  msisdn: request.msisdn,
                  url: 'redeem',
                  user_id: new IAccount(account),
                  result: {
                    message: error.message,
                    stack: error.stack,
                  },
                },
              });
            }
          }

          const remark = [
            _eligibility?.program_title_expose
              ? _eligibility?.program_title_expose
              : '',
            _eligibility.name,
            _eligibility?.program_experience
              ? program_experience
                ? program_experience
                : ''
              : '',
          ].join('|');

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';

          const newData = new this.redeemModel({
            ...request,
            parent_master_id: parent_transaction_id,
            transaction_date: this.transaction_date,
            tracing_id: trace_id.replace('TRX', 'RDM'),
            master_id: trace_id,
            merchant_id: merchant_id,
            created_by: (account as any)._id,
          });

          return newData
            .save()
            .catch((e: BadRequestException) => {
              this.logger.error({
                method: 'kafka',
                statusCode: HttpStatus.BAD_REQUEST,
                transaction_id: trace_id.replace('TRX', 'RDM'),
                notif_customer: false,
                notif_operation: true,
                taken_time: Date.now() - now,
                param: {
                  request: request,
                  trace_id: trace_id,
                  account: account,
                  token: token,
                },
                step: e.message,
                service: 'REDEEM',
                result: e,
              });
            })
            .then(async (redeem) => {
              // config amount for deduct
              let amount = request.total_redeem;
              if (typeof request.total_redeem == 'undefined') {
                amount = -1;
              } else if (request.total_redeem === 0) {
                amount = 0;
              }

              this.logger.verbose({
                method: 'kafka',
                statusCode: HttpStatus.OK,
                transaction_id: response.payload?.trace_id ?? '',
                notif_customer: false,
                notif_operation: true,
                taken_time: Date.now() - now,
                param: {
                  ...request,
                  tracing_id: trace_id.replace('TRX', 'RDM'),
                  master_id: trace_id,
                  created_by: (account as any)._id,
                },
                step: `Program registration : ${value.program.keyword_registration}`,
                service: 'REDEEM',
                result: {
                  msisdn: request.msisdn,
                  url: 'redeem',
                  user_id: new IAccount(account),
                  result: {},
                },
              });

              if (
                value.program.keyword_registration ===
                value.keyword.eligibility.name
              ) {
                // Is registration keyword
                amount = value.program.point_registration;
              }

              // campaign
              let campaign = {};
              const hasRedeemNotification = value.keyword?.notification?.find(
                (notif) =>
                  notif?.code_identifier_detail?.set_value ===
                  'Redeem Campaign', // 'Keyword Verification',
              );
              if (hasRedeemNotification) {
                campaign = {
                  template:
                    hasRedeemNotification?.code_identifier_detail
                      ?.notification_content,
                };
              }

              const coreRequest = {
                locale: request.locale, //"id-ID"
                type: 'reward',
                channel: channel_id,
                reward_item_id: value?.reward_item_id,
                reward_instance_id: value?.reward_instance_id,
                amount: amount,
                remark: remark,
                member_id: value.customer_core
                  ? value.customer_core[0]?.id
                  : null,
                realm_id: this.realm,
                branch_id: this.branch,
                merchant_id: this.merchant,
                __v: 0,
              };

              if (value.customer) {
                // remove prefix 01 for indihome number
                const checkIdentifier = checkCustomerIdentifier(request.msisdn);
                if (
                  checkIdentifier.isValid &&
                  checkIdentifier.type == FmcIdenfitiferType.INDIHOME
                ) {
                  value.customer.msisdn = formatIndihomeNumberToNonCore(
                    value.customer.msisdn,
                  );
                }
              }

              response.payload = {
                trace_id: trace_id,
                core: coreRequest,
                keyword: value.keyword,
                program: value.program,
                customer: value.customer,
                redeem: redeem,
                campaign: campaign,
                is_keyword_registration: value.is_keyword_registration,
                custom_origin: custom_origin,
              };

              return response;
            });
        })
        .catch((e) => {
          console.log(`Expected error : ${e}`);
          response.code = e.code
            ? e.code
            : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
          response.message = `${e.message} - ${e.stack}`;
          response.payload = {
            trace_id: trace_id,
          };
          return response;
        });
      // } else {
      //response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
      //   response.message =
      //     'Transaction_id was used before, please input another transaction_id';
      //   response.payload = {
      //     trace_id: trace_id,
      //   };
      //   return response;
      // }
    } catch (error) {
      console.log(error);
      await this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: trace_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - startTime,
        param: {
          request: request,
          trace_id: trace_id,
          account: account,
          token: token,
          custom_origin: custom_origin,
        },
        step: 'Redeem data preparation',
        service: 'REDEEM',
        result: {
          msisdn: request.msisdn,
          url: 'redeem',
          user_id: account,
          result: {
            message: error.message,
            stack: error.stack,
          },
        },
      });
    }
  }

  async redeem_v2_notification(request: any) {
    return await this.keywordNotificationModel.aggregate([
      {
        $lookup: {
          from: 'lovs',
          let: { code_id: '$code_identifier' },
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
                            input: '$$code_id',
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
              $project: {
                _id: false,
                __v: false,
                // created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'code_identifier_detail',
        },
      },
      {
        $unwind: '$code_identifier_detail',
      },
      {
        $project: {
          via: {
            $map: {
              input: '$via',
              as: 'via_detail',
              in: {
                $toObjectId: '$$via_detail',
              },
            },
          },

          keyword: true,
          bonus_type_id: true,
          keyword_name: true,
          code_identifier: true,
          notification_content: true,
          start_period: true,
          end_period: true,
          notif_type: true,

          code_identifier_detail: true,
        },
      },
      {
        $lookup: {
          from: 'lovs',
          let: { via_id: '$via' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$via_id'],
                },
              },
            },
          ],
          as: 'via_detail',
        },
      },

      // keyword
      {
        $lookup: {
          from: 'keywords',
          let: { keyword_id: '$keyword' },
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
            {
              $project: {
                _id: false,
                __v: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'keyword_detail',
        },
      },
      {
        $unwind: '$keyword_detail',
      },

      // program
      {
        $lookup: {
          from: 'programv2',
          let: { program_id: '$keyword_detail.eligibility.program_id' },
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
                            input: '$$program_id',
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
              $project: {
                _id: false,
                __v: false,
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'program_detail',
        },
      },
      {
        $unwind: '$program_detail',
      },
      {
        $match: {
          keyword_name: request.keyword,
        },
      },
    ]);
  }

  async get_msisdn_redeemer(
    keyword: string,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    const data = await this.redeemModel.findOne({
      keyword: keyword,
    });

    if (!data) {
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = 'Keyword is not found';
      response.transaction_classify = 'REDEEM';
      response.trace_custom_code = 'RDM';

      return response;
    }

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'RDM';
    response.payload = data;

    return response;
  }

  async payload_to_telco_prepaid(payload, bonus) {
    const configAdn = await this.callApiConfigService.callConfig('ADN');
    return {
      transaction_id: payload['trace_id'],
      channel: this.esbNgrsRechargeChannel,
      language: 'id',
      service_id_a: formatMsisdnToID(payload['customer']?.msisdn),
      offer_id: bonus.telco_pre_bid,
      adn: configAdn,
      keyword: payload['keyword'].eligibility.name,
      order_type: this.esbTelcoPrePaidOrderType,
      purchase_mode: this.esbTelcoPrePaidPurchaseMode,
      payment_method: this.esbTelcoPrePaidPaymentMethod,
      payment_name: this.esbTelcoPrePaidPaymentName,
      poin: `${payload['keyword'].eligibility.poin_redeemed}`,
      subscription_flag: this.esbTelcoPrePaidSubscription,
      callback_url: this.esbTelcoPrePaidCallbackUrl,
      version: this.esbTelcoPrePaidVersion,
    };
  }

  async payload_to_telco_postpaid(payload, bonus) {
    const configAdn = await this.callApiConfigService.callConfig('ADN');
    return {
      transaction_id: payload['trace_id'],
      channel: this.esbNgrsRechargeChannel,
      language: 'id',
      service_id_a: formatMsisdnToID(payload['customer']?.msisdn),
      offer_id: bonus.telco_post_bid,
      adn: configAdn,
      keyword: payload['keyword'].eligibility.name,
      order_type: this.esbTelcoPostPaidOrderType,
      purchase_mode: this.esbTelcoPostPaidPurchaseMode,
      payment_method: this.esbTelcoPostPaidPaymentMethod,
      payment_name: this.esbTelcoPostPaidPaymentName,
      poin: `${payload['keyword'].eligibility.poin_redeemed}`,
      subscription_flag: this.esbTelcoPostPaidSubscription,
      callback_url: this.esbTelcoPostPaidCallbackUrl,
      version: this.esbTelcoPostPaidVersion,
    };
  }

  // fungsi untuk multi bonus bonus type
  async calculateNominalByBonusType(payload, type) {
    const bonuses = payload['keyword'].bonus;
    let totalNominal = 0;

    for (let i = 0; i < bonuses.length; i++) {
      const bonus = bonuses[i];
      if (bonus.bonus_type === type) {
        totalNominal += parseInt(bonus.nominal);
      }
    }
    return totalNominal;
  }

  async payload_to_link_aja_main(payload) {
    const nominal = await this.calculateNominalByBonusType(
      payload,
      'linkaja_main',
    );
    return {
      customerNumber: formatMsisdnToID(payload['customer']?.msisdn),
      amount: nominal,
      partnerTrxID: payload['trace_id'],
      partnerTrxDate: new Date(),
    };
  }

  async payload_to_link_aja_bonus(payload) {
    const nominal = await this.calculateNominalByBonusType(
      payload,
      'linkaja_bonus',
    );
    return {
      trxid: payload['trace_id'],
      msisdn: formatMsisdnToID(payload['customer']?.msisdn),
      amount: nominal,
    };
  }

  async payload_to_link_aja_voucher(payload) {
    return {
      msisdn: formatMsisdnToID(payload['customer']?.msisdn),
      partner_voucher_id: payload['keyword'].bonus[0].partner_voucher_id
        ? payload['keyword'].bonus[0].partner_voucher_id
        : '',
      expiryDate: payload['keyword'].bonus[0].expiry_date
        ? payload['keyword'].bonus[0].expiry_date
        : '',
    };
  }

  async payload_to_ngrs(payload, bonus) {
    const locBucket: any = await this.locationBucketModel
      .findById(bonus.bucket)
      .then((result) => {
        return result;
      });

    return {
      transaction: {
        transaction_id: payload['trace_id'],
        channel: this.esbNgrsRechargeChannel,
      },
      service: {
        organization_code: this.esbNgrsRechargeOrgCode,
        service_id: formatMsisdnToID(payload['customer']?.msisdn),
      },
      recharge: {
        amount: bonus.nominal,
        stock_type: this.esbNgrsRechargeStockType,
        element1: locBucket.bucket_type.specify_data.element1,
      },
      merchant_profile: {
        third_party_id: this.esbNgrsMerchantThirdPartyId,
        third_party_password: this.esbNgrsMerchantThirdPartyPassword,
        delivery_channel: this.esbNgrsMerchantDeliveryChannel,
        organization_short_code: locBucket.bucket_type.specify_data.short_code,
      },
    };
  }

  async payload_to_coupon(payload, bonus) {
    const merchant = payload.keyword.eligibility?.merchant
      ? await this.merchantModel.findById(payload.keyword.eligibility?.merchant)
      : null;
    const date = new Date();
    return {
      locale: 'en-US',
      type: 'Coupon',
      transaction_no: payload['trace_id'],
      prefix: this.coupon_prefix ? this.coupon_prefix : 'CP',
      owner_phone: `${formatMsisdnCore(payload['customer']?.msisdn)}|ID|+62`,
      owner_id: payload['customer']?.core_id,
      owner_name: payload['customer']?.msisdn,
      product_name: payload['keyword'].eligibility.name,
      remark: payload['keyword'].eligibility.name,
      merchant_name: merchant?.company_name ? merchant?.company_name : 'SL',
      expiry: {
        expire_type: 'endof',
        expire_endof: {
          value: 12,
          unit: 'month',
        },
      },
      product_id: this.coupon_product,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
    };
  }

  async payload_to_mbp(payload, bonus, mbp) {
    const merchant = payload.keyword.eligibility?.merchan
      ? await this.merchantModel.findById(payload.keyword.eligibility?.merchant)
      : null;
    const date = new Date();

    return {
      locale: 'en-US',
      type: 'MBP',
      transaction_no: payload['trace_id'],
      prefix: 'MBP',
      owner_phone: `${payload['customer']?.msisdn}|ID|+62`,
      owner_id: payload['customer']?.core_id,
      owner_name: payload['customer']?.msisdn,
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
      merchant_name: merchant?.company_name ? merchant?.company_name : 'SL',
      bank_code: mbp['bank_code'],
      ip_address: mbp['ip_address'],
      length: mbp['digit_coupon'],
      combination: mbp['combination_coupon'],
      expiry: {
        expire_type: 'endof',
        expire_endof: {
          value: 12,
          unit: 'month',
        },
      },
      product_id: this.coupon_product,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
    };
  }

  async payload_to_direct_redeem(payload: any, bonus: any) {
    return {
      msisdn: payload['customer']?.msisdn,
      keyword: payload['keyword']?._id,
      merchant: payload['core']?.merchant_id,
      stock_type: bonus?.stock_type,
      threshold: bonus?.threshold,
      merchandise: bonus?.merchandise,
      keyword_schedule: payload['keyword']?.eligibility?.keyword_schedule,
      keyword_shift: payload['keyword']?.eligibility?.keyword_shift,
    };
  }

  async payload_to_void(payload: any) {
    return {
      msisdn: payload['customer']?.msisdn ?? '',
      keyword: payload['keyword']?.eligibility?.name ?? '',
    };
  }

  // Function: getVoucherPayload
  // Example Return:
  // {
  //   "incoming": {
  //     "batch_no": "VCR01_2022-12-22T03:55:42.175Z",
  //     "combination": "Alphabet",
  //     "digit_length": 5,
  //     "prefix": "VCR",
  //     "voucher_type": "Generate",
  //     "stock": 2,
  //     "exp_voucher": "2",
  //     "type": "stock"
  //   },
  //   "voucher": {
  //       "locale": "id-ID",
  //       "batch_no": "VCR01_2022-12-22T03:55:42.175Z",
  //       "batch_size": 2,
  //       "type": "Product",
  //       "name": "Product Voucher Example",
  //       "status": "Active",
  //       "product_name": "Product Voucher",
  //       "prefix": "VCR",
  //       "combination": "Alphabet",
  //       "desc": "",
  //       "merchant_name": "Telkomsel",
  //       "product_id": "prodct-63a1ae98bbfabc0ea4afad45"
  //   }
  // }

  async getVoucherPayload(payload, data: RedeemDTO) {
    const keyword = payload['keyword'];

    // diambil dari program title expose
    const voucher_desc = keyword?.eligibility?.program_title_expose
      ? keyword?.eligibility?.program_title_expose
      : '';

    // Incoming
    const incoming = new VoucherDTO();
    const date = new Date();
    const voucher = keyword.bonus.filter(
      (e) => e.bonus_type == 'discount_voucher',
    )[0];

    if (voucher) {
      // TODO :: Fixing batch_no on redeem case - 2023-11-18
      const batch_no = `${keyword.eligibility.name}_${keyword['_id']}#UNL`;

      incoming.batch_no = batch_no;
      incoming.keyword_id = keyword['_id'];
      incoming.keyword_name = keyword.eligibility.name;
      incoming.combination = voucher['voucher_combination'];
      incoming.digit_length = voucher['jumlah_total_voucher'] ?? 16;
      incoming.prefix = voucher['voucher_prefix'];
      incoming.voucher_type = voucher['voucher_type'];
      incoming.file = voucher['file'];
      incoming.stock = voucher['stock_location']
        ? voucher['stock_location'].reduce((acc, item) => acc + item.stock, 0)
        : 0;
      incoming.exp_voucher = voucher['exp_voucher'];
      incoming.type = incoming.stock > 0 ? 'stock' : 'non_stock';
      incoming.merchant_id = keyword.eligibility.merchant;

      // const voucher_desc = await this.applicationService.getConfig(
      //   'DEFAULT_VOUCHER_DESCRIPTION', //get id from lov (where set_value : "Keyword Verification")
      // );

      const voucher_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_product_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_PRODUCT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_type = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_TYPE', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_merchant_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_MERCHANT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      // Payload to Core
      const corePayload = new VoucherBatchDto();
      corePayload.locale = data.locale ? data.locale : 'id-ID';
      corePayload.batch_no = incoming.batch_no;
      corePayload.batch_size = incoming.stock;
      corePayload.type = voucher_type ? voucher_type : 'Product';
      corePayload.name = voucher_name
        ? voucher_name
        : 'Product Voucher Telkomsel';
      corePayload.status = 'Redeem';
      corePayload.product_name = voucher_product_name
        ? voucher_product_name
        : `Product Voucher Telkomsel`;
      if (incoming.prefix) {
        corePayload.prefix = incoming.prefix;
      }
      corePayload.combination = incoming.combination;
      corePayload.length = Number(incoming.digit_length); // CAST VOUCHER LENGTH TO INTEGER
      corePayload.desc = voucher_desc;
      corePayload.merchant_name = voucher_merchant_name
        ? voucher_merchant_name
        : 'Telkomsel';
      corePayload.product_id = this.product;
      corePayload.start_time = date;
      corePayload.end_time = date;
      corePayload.transaction_no = payload['trace_id'];

      if (
        incoming.voucher_type == 'Generate' ||
        incoming.voucher_type == 'Upload'
        // (incoming.voucher_type == 'Upload' && incoming.file)
      ) {
        if (incoming.voucher_type == 'Upload') {
          // if (incoming.voucher_type == 'Upload' && incoming.file) {
          // to get this function need async
          // corePayload.batch_size = await this.countDataFileCsv(
          //   `./uploads/voucher/${incoming.file.filename}`,
          // );
          // incoming.stock = corePayload.batch_size;
          incoming.stock = 1;
        }
        return {
          incoming: incoming,
          core: corePayload,
        };
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  async getDonationPayload(req, payload) {
    const keyword = payload['keyword'];

    // payload
    const donationPayload = {
      keyword: keyword._id,
      start_time: keyword.eligibility.start_period,
      end_time: keyword.eligibility.end_period,
      trace_id: payload.trace_id.replace('TRX', 'DON'),
      master_id: payload.trace_id,
      msisdn: req.msisdn,
      total_redeem: validationKeywordPointValueRule(payload, req?.total_redeem),
      time: new Date().toISOString(),
    };

    // save
    // await this.donationService.inject_donation(keyword, donationPayload);

    return donationPayload;
  }

  async getPoinPayload(account, payload, token, request) {
    // payload
    const keyword = payload['keyword'];
    const totalPoin = keyword.bonus.filter(
      (e) => e.bonus_type == 'loyalty_poin',
    )[0];
    const pointPayload = {
      locale: request.locale,
      total_point: totalPoin?.earning_poin ? totalPoin?.earning_poin : 0,
      msisdn: payload['customer']?.msisdn
        ? payload['customer']?.msisdn
        : formatMsisdnToID(payload['incoming']?.msisdn),
      keyword: payload['keyword'].eligibility.name,
    };
    // save
    return await this.pointService.point_inject(
      <InjectPoint>pointPayload,
      account,
      token,
      false,
    );
  }

  // TODO: Voting validation
  // async getVotingPayload(request, payload) {
  //   const additional_param = request?.additional_param
  //     ? JSON.parse(request?.additional_param)
  //     : null;
  //   if (!additional_param) return null;

  //   return {
  //     keyword: payload['keyword'].eligibility.name,
  //     option: additional_param.vote_option,
  //   };
  // }

  // async isValidVoteKeyword(request, payload) {
  //   const voting = payload['keyword'].bonus.filter(
  //     (e) => e.bonus_type == 'voting',
  //   );

  //   if (voting.length > 0) {
  //     const votingPayload = await this.getVotingPayload(request, payload);
  //     if (!votingPayload) {
  //       return false;
  //     }

  //     const optionAvailable =
  //       await this.voteService.checkVoteOptionAvailableFromVote(
  //         payload['keyword'],
  //         votingPayload.option,
  //       );
  //     if (!optionAvailable) {
  //       return false;
  //     }
  //   }

  //   return true;
  // }

  async getReportingPointEventBiPayload(payload) {
    const merchant = payload?.keyword?.merchant
      ? await this.merchantModel.findById(payload.keyword.merchant)
      : null;

    const point_type = await this.lovService.getLovData(
      payload?.program?.point_type,
    );

    return {
      merchant_name: merchant?.company_name ? merchant?.company_name : '',
      point_type: point_type?.set_value ? point_type.set_value : '',
    };
  }

  private async countDataFileCsv(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      // Buat stream untuk membaca file CSV
      const stream = createReadStream(filePath);

      // Buat parser untuk mengolah data CSV
      const parser = new Parser({});

      // Tambahkan listener untuk setiap baris yang dibaca
      parser.on('data', () => {
        count++;
      });

      // Tambahkan listener untuk event end untuk menyelesaikan proses pembacaan
      parser.on('end', () => {
        // Kembalikan jumlah baris yang dibaca
        const c = count - 1;
        resolve(c);
        return c;
      });

      // Mulai membaca file CSV
      stream.pipe(parser);
    });
  }

  async emit_process(
    response,
    config: {
      token;
      path;
      data;
      account;
      applicationService;
      client;
      origin;
      bulk_keyword;
      priority;
    },
  ) {
    try {
      const now = Date.now();
      if (response.code === 'S00000') {
        let telco_prepaid = null;
        let telco_postpaid = null;
        let link_aja_bonus = null;
        let link_aja_main = null;
        let link_aja_voucher = null;
        let ngrs = null;
        let coupon = null;
        let donation = null;
        let direct_redeem = null;
        let voucher = null;
        let payload_void = null;
        let loyalty_poin = null;
        let mbp = null;
        let bonus_type = null;
        const campaign = null;
        let voting = null;

        const bonus = response.payload['keyword']['bonus'];

        response.payload['keyword'].created_by = new IAccount(
          response.payload['keyword'].created_by,
        );

        response.payload['program'].created_by = new IAccount(
          response.payload['program'],
        );

        if (!response.payload['customer']) {
          response.payload['customer'] = {
            msisdn: response.payload['redeem'].msisdn,
          };
        }

        if (bonus.length > 0) {
          for (const single_bonus of bonus) {
            bonus_type = single_bonus.bonus_type;
            switch (single_bonus.bonus_type) {
              case 'telco_postpaid':
                telco_postpaid = await this.payload_to_telco_postpaid(
                  response.payload,
                  single_bonus,
                );
                break;
              case 'telco_prepaid':
                telco_prepaid = await this.payload_to_telco_prepaid(
                  response.payload,
                  single_bonus,
                );
                break;
              case 'linkaja_main':
                link_aja_main = await this.payload_to_link_aja_main(
                  response.payload,
                );
                break;
              case 'linkaja_bonus':
                link_aja_bonus = await this.payload_to_link_aja_bonus(
                  response.payload,
                );
                break;
              case 'linkaja_voucher':
                link_aja_voucher = await this.payload_to_link_aja_voucher(
                  response.payload,
                );
                break;
              case 'ngrs':
                ngrs = await this.payload_to_ngrs(
                  response.payload,
                  single_bonus,
                );
                break;
              case 'lucky_draw':
                coupon = await this.payload_to_coupon(
                  response.payload,
                  single_bonus,
                );
                break;
              case 'direct_redeem':
                direct_redeem = await this.payload_to_direct_redeem(
                  response.payload,
                  single_bonus,
                );
                break;
              case 'discount_voucher':
                voucher = await this.getVoucherPayload(
                  response.payload,
                  config.data,
                );
                break;
              case 'void':
                payload_void = await this.payload_to_void(response.payload);
                break;
              case 'donation':
                donation = await this.getDonationPayload(
                  config.data,
                  response.payload,
                );
                break;
              case 'loyalty_poin':
                loyalty_poin = await this.getPoinPayload(
                  config.account,
                  response.payload,
                  config.token,
                  config.data,
                );

                loyalty_poin = loyalty_poin?.payload?.core;
                break;
              case 'mbp':
                mbp = await this.payload_to_mbp(
                  response.payload,
                  config.data,
                  single_bonus,
                );
                break;
              case 'voting':
                voting = await this.getVotingPayload(
                  config.data,
                  response.payload,
                );
                break;
              default:
                break;
            }
          }
        }

        const reportingPointEventBiPayload =
          await this.getReportingPointEventBiPayload(response.payload);

        const tracing_id_voucher =
          this.transactionOptional.getTracingIdWithLength(
            25,
            config.data,
            response,
          );

        const account: IAccount = config.account;
        const json = {
          transaction_classify: 'REDEEM',
          trace_custom_code: 'RDM',
          origin: 'redeem',
          program: response.payload['program'],
          keyword: response.payload['keyword'],
          keyword_priority: config.priority,
          customer: response.payload['customer'],
          endpoint: config.path,
          redeem: response.payload['redeem'],
          tracing_id: response.payload['trace_id'],
          tracing_master_id: response.payload['trace_id'],
          tracing_id_voucher: tracing_id_voucher,
          incoming: config.data,
          account: account,
          submit_time: this.transaction_date,
          token: config.token,
          bonus_type: bonus_type,
          is_stock_deducted: false,
          is_coupon_bulk_approval: response?.is_coupon_bulk_approval ?? false,
          is_keyword_registration: response.payload['is_keyword_registration'],
          is_whitelist_deducted: false,
          retry: {
            deduct: {
              counter: 0,
              errors: [],
            },
            refund: {
              counter: 0,
              errors: [],
            },
            inject_point: {
              counter: 0,
              errors: [],
            },
            donation: {
              counter: 0,
              errors: [],
            },
            coupon: {
              counter: 0,
              errors: [],
            },
            outbound: {
              counter: 0,
              errors: [],
            },
          },
          rule: {
            fixed_multiple: {
              counter: 0,
              counter_fail: 0,
              counter_success: 0,
              message: [],
              status: [],
              transactions: [],
            },
          },
          payload: {
            deduct: response.payload['core'],
            telco_postpaid: telco_postpaid,
            telco_prepaid: telco_prepaid,
            link_aja_bonus: link_aja_bonus,
            link_aja_main: link_aja_main,
            link_aja_voucher: link_aja_voucher,
            ngrs: ngrs,
            coupon: coupon,
            donation: donation,
            voucher: voucher,
            direct_redeem: direct_redeem,
            void: payload_void,
            inject_point: loyalty_poin,
            mbp: mbp,
            reporting_point_event_bi: reportingPointEventBiPayload,
            voting: voting,
          },
        };

        // const noConfig = await this.applicationService.getConfig(
        //   'PROGRAM_NO_RULE_MECHANISM',
        // );

        // await this.client.emit('deduct', json);

        // set step for recovery
        // await this.transactionRecoveryService.setStep(json, 'eligibility');

        // if (
        //   response.payload['program'].program_mechanism.toString() ===
        //   noConfig.toString()
        // ) {
        //   json.origin = 'redeem.norule';
        //   this.clientDeduct.emit('deduct', json);
        //   console.log('to deduct');
        // } else {

        // shorting redeem
        delete json.program.created_by?.core_payload?.authorizes;
        delete json.keyword.created_by?.core_payload?.authorizes;
        delete json.keyword.reward_catalog;
        // delete json.account.core_payload?.authorizes;
        console.log(`config.priority ${config.priority}`);
        if (config.priority === 'HIGH') {
          this.clientEligibilityHigh.emit(
            process.env.KAFKA_ELIGIBILITY_HIGH_TOPIC,
            json,
          );
        } else if (config.priority === 'LOW') {
          this.clientEligibilityLow.emit(
            process.env.KAFKA_ELIGIBILITY_LOW_TOPIC,
            json,
          );
        } else {
          this.clientEligibility.emit(
            process.env.KAFKA_ELIGIBILITY_TOPIC,
            json,
          );
        }

        this.clientTransactionMaster.emit(
          process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
          json,
        );

        this.logger.verbose({
          method: 'kafka',
          statusCode: HttpStatus.OK,
          transaction_id: response.payload['trace_id'],
          notif_customer: false,
          notif_operation: true,
          taken_time: Date.now() - now,
          param: json,
          step: `Emit to eligibility service and transaction_master service`,
          service: 'REDEEM',
          result: {
            msisdn: json.incoming.msisdn,
            url: 'redeem',
            user_id: new IAccount(account),
            result: {},
          },
        });
      } else {
        await this.logger.error({
          method: 'kafka',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          transaction_id: response.payload['trace_id'],
          notif_customer: false,
          notif_operation: true,
          taken_time: Date.now() - now,
          param: config.data,
          step: 'Redeem Exception',
          service: 'REDEEM',
          result: {
            msisdn: config.data.msisdn,
            url: 'redeem',
            user_id: new IAccount(config.account),
            result: {
              message: response.message,
              stack: response.stack,
            },
          },
        });
      }

      // keyword (master) not found?
      // console.log({ response, config });
      if (response.code === HttpStatusTransaction.ERR_KEYWORD_UTAMA_FOUND) {
        // const keywordNotifications = await this.redeem_v2_notification(
        //   config.data,
        // );
        const keywordNotifications = await this.redeem_v2_notification({
          keyword: config.bulk_keyword,
        });
        const program =
          await this.programService.getProgramByKeywordRegistration(
            config?.data?.keyword,
          );

        // reject jika lebih dari satu
        if (keywordNotifications.length > 1) {
          response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
          response.message = 'More than one Notification Keyword!';
          // response.transaction_classify = 'REDEEM';
          // response.trace_custom_code = 'RDM';
          // response.payload = {};
          return response;
        } else if (program?.keyword_registration?.length) {
          // Handle Keyword Registration
          const NO_RULE = await this.applicationService.getConfig(
            'PROGRAM_NO_RULE_MECHANISM',
          );
          await this.handleKeywordRegistration({
            response,
            config,
            program: { ...program, program_mechanism: NO_RULE },
          });
        } else {
          // proses void
          const keywordNotif = keywordNotifications[0];
          if (
            keywordNotif?.program_detail?.name &&
            keywordNotif?.keyword_detail
          ) {
            const payloadToVoid = {
              origin: config.origin,
              msisdn: config.data.msisdn,
              program_name: keywordNotif?.program_detail.name,
              token: config.token,
              incoming: config.data,
              tracing_id: response.transaction_id,
              tracing_master_id: response.transaction_id,
              transaction_id: response.transaction_id,
              keyword: keywordNotif?.keyword_detail,
              keyword_notification: keywordNotif,
              payload: {
                void: {
                  keyword: config.bulk_keyword,
                },
              },
              customer: {
                msisdn: config.data.msisdn,
              },
            };

            await this.clientVoid.emit(
              process.env.KAFKA_VOID_TOPIC,
              payloadToVoid,
            );

            response.code = HttpStatusTransaction.CODE_SUCCESS;
            response.message = 'Success';
          } else {
            response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
            response.message = 'Keyword not found';
          }
        }
      }
      return response;
    } catch (error) {
      console.log('<-- CATCH :: REDEEM :: EMIT_PROCCESS -->');
      console.log(error);
      console.log('<-- CATCH :: REDEEM :: EMIT_PROCCESS -->');
      return response;
    }
  }

  async handleKeywordRegistration(params: {
    response;
    config;
    program;
  }): Promise<void> {
    const { response, config, program: programParams } = params;

    console.log('=== Keyword Registration ===');

    const NO_RULE = await this.applicationService.getConfig(
      'PROGRAM_NO_RULE_MECHANISM',
    );

    const bonus_type = 'void';
    const program = { ...programParams, program_mechanism: NO_RULE };
    const keyword = {
      eligibility: {
        name: program?.registration_keyword,
        poin_redeemed: program?.point_registration ?? 0,
        poin_value: 'Flexible',
      },
      bonus: [
        {
          bonus_type: 'void',
          stock_location: [],
        },
      ],
    };
    const customer = {};
    const redeem = {};

    const lov = await this.lovService.getLovData(program?.point_type);
    const reward_item_id = lov?.additional?.split('|')?.[1];
    console.log(
      `---------------------REGISTRATION POINT :${program.point_registration}`,
    );

    const payload_deduct = {
      locale: 'id-ID',
      type: 'reward',
      channel: 'Application',
      reward_item_id: reward_item_id,
      remark: '',
      member_id: null,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
      amount: program?.point_registration ?? 0,
    };
    const payload_void = {
      keyword: program?.registration_keyword,
      msisdn: config?.data?.msisdn,
    };

    const json = {
      is_keyword_registration: true,
      transaction_classify: 'REDEEM',
      trace_custom_code: 'RDM',
      origin: 'redeem',
      program: program,
      keyword: keyword,
      customer: customer,
      endpoint: config.path,
      redeem: redeem,
      tracing_id: response.payload?.trace_id ?? '',
      tracing_master_id: response.payload?.trace_id ?? '',
      incoming: config.data,
      account: config.account,
      submit_time: new Date().toISOString(),
      token: config.token,
      bonus_type: bonus_type,
      is_stock_deducted: false,
      retry: {
        void: {
          counter: 0,
          errors: [],
        },
      },
      payload: {
        deduct: payload_deduct,
        void: payload_void,
      },
    };

    // emit eligibility
    // shorting redeem
    delete json.program.created_by?.core_payload?.authorizes;
    // delete json.keyword.created_by?.core_payload?.authorizes;
    delete json.account.core_payload?.authorizes;
    this.clientEligibility.emit(process.env.KAFKA_ELIGIBILITY_TOPIC, json);

    // save to transaction master
    this.clientTransactionMaster.emit(
      process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
      json,
    );
  }

  async save_batch_process_log(origin_name: string, transaction: string) {
    const newData = new this.batchProcessLog({
      origin_name,
      internal_name: null,
      transaction: transaction,
      status: BatchProcessEnum.WAITING,
    });

    await newData.save().catch((e: Error) => {
      console.log(e);
      console.log(`Error Save Log ${e.message}`);
    });

    return newData;
  }

  /**
   * This function as check avail to process redeem
   * @param program
   * @param keyword
   * @param maxMode
   * @param maxRedeemCounter
   * @param date
   * @param from
   * @param to
   */
  async maxRedeemHandler(
    program: string,
    keyword: string,
    maxMode: MaxModeConstant,
    maxRedeemCounter: number,
    date: Date,
    from?: Date,
    to?: Date,
    msisdn?: string,
    keyword_shift?: any,
  ) {
    const now = Date.now();
    try {
      const today = new Date();
      const getYear = today.getFullYear();
      const year = today.getFullYear();
      const month = today.getMonth();

      const payload = new this.checkRedeem({
        program: program,
        keyword: keyword,
        max_mode: maxMode,
        from: from,
        to: to,
        counter: 1,
      });
      let checkRedeemFindByOne = null;
      switch (maxMode.toLowerCase()) {
        case (maxMode = MaxModeConstant.DAY):
          // from
          const dayDown = new Date(today.setUTCHours(0, 0, 0));
          const formattedDateDown = dayDown.toISOString().split('.')[0];

          // to
          const dayUp = new Date(today.setUTCHours(23, 59, 59));
          const formattedDateUp = dayUp.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedDateDown,
              to: formattedDateUp,
            })
            .exec();
          const dayCheckDate = date >= dayDown && date <= dayUp;
          return await this.redeemProcess(
            checkRedeemFindByOne,
            dayCheckDate,
            payload,
            maxRedeemCounter,
            formattedDateDown,
            formattedDateUp,
            msisdn,
          );

        case (maxMode = MaxModeConstant.MONTH):
          // from
          const firstDayOfMonth = new Date(year, month, 1);
          const formattedDayUp = firstDayOfMonth.toISOString().split('.')[0];

          // to
          const lastDayOfMonth = new Date(year, month + 1, 0);
          const formattedDayDown = lastDayOfMonth.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedDayUp,
              to: formattedDayDown,
            })
            .exec();
          const monthCheckDate =
            date >= firstDayOfMonth && date <= lastDayOfMonth;
          return await this.redeemProcess(
            checkRedeemFindByOne,
            monthCheckDate,
            payload,
            maxRedeemCounter,
            formattedDayUp,
            formattedDayDown,
            msisdn,
          );

        case (maxMode = MaxModeConstant.YEAR):
          const endOfMonth = new Date(getYear, 11, 0);
          const lastDayOfMonthDesc = endOfMonth.getDate();

          // from
          const firstMonth = new Date(getYear, 0, 1);
          const formattedMonthUp = firstMonth.toISOString().split('.')[0];

          // to
          const lastMonth = new Date(getYear, 11, lastDayOfMonthDesc);
          const formattedMonthDown = lastMonth.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedMonthUp,
              to: formattedMonthDown,
            })
            .exec();
          const yearCheckDate = date >= firstMonth && date <= lastMonth;
          return await this.redeemProcess(
            checkRedeemFindByOne,
            yearCheckDate,
            payload,
            maxRedeemCounter,
            formattedMonthUp,
            formattedMonthDown,
            msisdn,
          );

        case (maxMode = MaxModeConstant.PROGRAM):
          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              max_mode: payload.max_mode,
              from: '',
              to: '',
            })
            .exec();

          return await this.redeemProcess(
            checkRedeemFindByOne,
            true,
            payload,
            maxRedeemCounter,
            '',
            '',
            msisdn,
          );

        case (maxMode = MaxModeConstant.SHIFT):
          let isValid = {};

          for (const keyword_shiftItem of keyword_shift) {
            // const time = new Date(date);
            // time.setHours(time.getHours() + 7);

            // const from = new Date(keyword_shiftItem.from);
            // from.setHours(from.getHours() + 7);
            // const formattedShiftFrom = from.toISOString().split('.')[0];
            // const to = new Date(keyword_shiftItem.to);
            // to.setHours(to.getHours() + 7);
            // const formattedShiftTo = to.toISOString().split('.')[0];
            const todayDate = new Date().toISOString().slice(0, 10);
            const time = new Date(date);
            const submitHours = time.getUTCHours();
            // const formattedShiftTime = time.toISOString().split('.')[0];

            const from = new Date(keyword_shiftItem.from);
            // const formattedShiftFrom = from.toISOString().split('.')[0];
            const fromHours = from.getUTCHours();
            const to = new Date(keyword_shiftItem.to);
            // const formattedShiftTo = to.toISOString().split('.')[0];
            const toHours = to.getUTCHours();

            const checkRedeemFindByOne = await this.checkRedeem
              .findOne({
                msisdn: msisdn,
                program: program,
                keyword: keyword,
                max_mode: MaxModeConstant.SHIFT,
                from: `${todayDate}|${fromHours}|${toHours}`,
                to: `${todayDate}|${fromHours}|${toHours}`,
              })
              .exec();

            if (submitHours >= fromHours && submitHours <= toHours) {
              isValid = await this.redeemProcess(
                checkRedeemFindByOne,
                true,
                payload,
                maxRedeemCounter,
                `${todayDate}|${fromHours}|${toHours}`,
                `${todayDate}|${fromHours}|${toHours}`,
                msisdn,
              );
              break;
            }
          }
          return isValid;

        default:
          console.log('Not defined');
      }
    } catch (e) {
      this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.BAD_REQUEST,
        transaction_id: '',
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - now,
        param: {},
        step: e.message,
        service: 'REDEEM',
        result: e,
      });
    }
  }

  async getCustomerRedeem(keyword: any) {
    const customers = await this.redeemModel.aggregate([
      { $match: { keyword: { $in: keyword } } },
      {
        $group: {
          _id: {
            keyword: '$keyword',
            msisdn: '$msisdn',
          },
        },
      },
    ]);

    const formatCustomers = [];
    for (let index = 0; index < customers.length; index++) {
      formatCustomers[index] = customers[index]._id;
    }

    return formatCustomers;
  }

  /**
   * This function as store data to checkRedeem collection
   * @param checkRedeemFindByOne
   * @param isCanRedeem
   * @param payload
   * @param maxRedeemCounter
   */
  async redeemProcess(
    checkRedeemFindByOne: CheckRedeem,
    isCanRedeem: boolean,
    payload: any,
    maxRedeemCounter: number,
    fromDate?: any,
    toDate?: any,
    msisdn?: string,
  ) {
    if (!isCanRedeem) {
      const payloadData = {
        eligible: false,
        payload: payload,
      };
      return payloadData;
    }
    if (!checkRedeemFindByOne) {
      if (payload.max_mode === 'Program') {
        const newData = new this.checkRedeem({
          msisdn: msisdn,
          program: payload.program,
          keyword: '',
          max_mode: payload.max_mode,
          from: fromDate,
          to: '',
          counter: 1,
        });

        await newData
          .save()
          .then((data) => {
            payload = data;
          })
          .catch((e: Error) => {
            console.log(e.message);
          });
      } else {
        const newData = new this.checkRedeem({
          msisdn: msisdn,
          program: payload.program,
          keyword: payload.keyword,
          max_mode: payload.max_mode,
          from: fromDate,
          to: toDate,
          counter: 1,
        });
        await newData
          .save()
          .then((data) => {
            payload = data;
          })
          .catch((e: Error) => {
            console.log(e.message);
          });
      }
      // payload.save();
      // return true;
      const payloadData = {
        eligible: true,
        payload: payload,
      };
      return payloadData;
    } else {
      if (payload.max_mode === 'Program') {
        if (checkRedeemFindByOne.counter < maxRedeemCounter) {
          await this.checkRedeem.findOneAndUpdate(
            {
              msisdn: msisdn,
              program: payload.program,
              max_mode: payload.max_mode,
            },
            { $inc: { counter: 1 }, updated_at: new Date() },
          );
          // paylot.counter = paylot.counter + 1;
          // checkRedeemFindByOne = paylot;
        }
      } else {
        if (checkRedeemFindByOne.counter < maxRedeemCounter) {
          await this.checkRedeem.findOneAndUpdate(
            {
              msisdn: msisdn,
              program: payload.program,
              keyword: payload.keyword,
              max_mode: payload.max_mode,
              from: fromDate,
              to: toDate,
            },
            { $inc: { counter: 1 }, updated_at: new Date() },
          );
          // paylot.counter = paylot.counter + 1;
          // checkRedeemFindByOne = paylot;
        }
      }
      const payloadData = {
        eligible: checkRedeemFindByOne.counter < maxRedeemCounter,
        payload: checkRedeemFindByOne,
      };
      return payloadData;
    }
  }

  async is_bulk_redeem_coupon_confirmation_keyword(
    keyword: string,
    response: any,
  ): Promise<boolean> {
    // if (response.code != HttpStatusTransaction.ERR_KEYWORD_UTAMA_FOUND) {
    //   return false;
    // }

    const now = Date.now();

    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CONFIRMATION_CODE_IDENTIFIER',
    );

    const key = `${RedisDataKey.KEYWORD_KEY2}-coupon-confirmation-${keyword}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load keyword_coupon_confirmation ${keyword} from Redis|${
          Date.now() - now
        }`,
      );

      result = true;
    } else {
      const bulk_redeem_confirm_notif = await this.keywordNotificationModel
        .findOne({
          keyword_name: keyword,
          code_identifier: lov_id,
          notification_content: { $not: { $eq: '' } },
        })
        .lean();

      console.log(
        `REDIS|Load keyword_coupon_confirmation ${keyword} from Database|${
          Date.now() - now
        }`,
      );

      if (bulk_redeem_confirm_notif) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async is_bulk_redeem_coupon_approval_keyword(
    keyword: string,
    msisdn: string,
  ): Promise<boolean> {
    /**
     * Keyword Example : YA <spasi> OTP
     */
    const keywordFromBody = keyword.trim().split(' ');

    if (
      keywordFromBody.length === 2 &&
      keywordFromBody[0] === 'YA' &&
      !Number.isNaN(Number(keywordFromBody[1]))
    ) {
      const now = Date.now();

      // get keyword from OTP
      const msisdnIndo = formatMsisdnCore(msisdn);
      const otpDetail = await this.otpService.otpDetail(
        msisdnIndo,
        keywordFromBody[1],
      );

      if (otpDetail) {
        const lov_id = await this.applicationService.getConfig(
          'BULK_REDEEM_COUPON_APPROVAL_CODE_IDENTIFIER',
        );

        const key = `${RedisDataKey.KEYWORD_KEY2}-coupon-approval-code-${otpDetail.keyword}`;
        const redisKeyword: any = await this.cacheManager.get(key);

        if (redisKeyword) {
          console.log(
            `REDIS|Load keyword_coupon_aproval_code ${
              otpDetail.keyword
            } from Redis|${Date.now() - now}`,
          );

          return true;
        } else {
          const bulk_redeem_confirm_notif = await this.keywordNotificationModel
            .findOne({
              keyword: otpDetail.keyword,
              keyword_name: keywordFromBody[0],
              code_identifier: lov_id,
              notification_content: { $not: { $eq: '' } },
            })
            .lean();

          console.log(
            `REDIS|Load keyword_coupon_approval_code ${
              otpDetail.keyword
            } from Database|${Date.now() - now}`,
          );

          if (bulk_redeem_confirm_notif) {
            await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
            return true;
          }
        }
      }
    }

    return false;
  }

  async is_bulk_redeem_coupon_info_keyword(keyword: string): Promise<boolean> {
    const now = Date.now();

    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_INFO_CODE_IDENTIFIER',
    );

    const key = `${RedisDataKey.KEYWORD_KEY2}-coupon-info-${keyword}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load keyword_coupon_info ${keyword} from Redis|${
          Date.now() - now
        }`,
      );

      result = true;
    } else {
      const bulk_redeem_confirm_notif = await this.keywordNotificationModel
        .findOne({
          keyword_name: keyword,
          code_identifier: lov_id,
          notification_content: { $not: { $eq: '' } },
        })
        .lean();

      console.log(
        `REDIS|Load keyword_coupon_info ${keyword} from Database|${
          Date.now() - now
        }`,
      );

      if (bulk_redeem_confirm_notif) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async is_bulk_redeem_coupon_check_keyword(keyword: string): Promise<boolean> {
    const now = Date.now();

    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CHECK_CODE_IDENTIFIER',
    );

    const key = `${RedisDataKey.KEYWORD_KEY2}-coupon-check-${keyword}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load keyword_coupon_check ${keyword} from Redis|${
          Date.now() - now
        }`,
      );

      result = true;
    } else {
      const bulk_redeem_confirm_notif = await this.keywordNotificationModel
        .findOne({
          keyword_name: keyword,
          code_identifier: lov_id,
          notification_content: { $not: { $eq: '' } },
        })
        .lean();

      console.log(
        `REDIS|Load keyword_coupon_check ${keyword} from Database|${
          Date.now() - now
        }`,
      );

      if (bulk_redeem_confirm_notif) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async is_keyword_registration_check(keyword: string): Promise<boolean> {
    const data = await this.programService.getProgramByKeywordRegistration(
      keyword,
    );

    if (data) {
      return true;
    }

    return false;
  }

  async is_auction_top_bidder(keyword: string): Promise<boolean> {
    const now = Date.now();

    const lov_id = await this.applicationService.getConfig(
      'AUCTION_TOP_BIDDER_CODE_IDENTIFIER',
    );

    const key = `${RedisDataKey.KEYWORD_KEY2}-auction-top-bidder-${keyword}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load auction_top_bidder ${keyword} from Redis|${
          Date.now() - now
        }`,
      );

      result = true;
    } else {
      const auctionSummaryKeyword = await this.keywordNotificationModel
        .findOne({
          keyword_name: keyword,
          code_identifier: lov_id,
          notification_content: { $not: { $eq: '' } },
        })
        .lean();

      console.log(
        `REDIS|Load auction_top_bidder ${keyword} from Database|${
          Date.now() - now
        }`,
      );

      if (auctionSummaryKeyword) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async is_auction_summary_keyword(keyword: string): Promise<boolean> {
    const now = Date.now();

    const lov_id = await this.applicationService.getConfig(
      'AUCTION_SUMMARY_KEYWORD_CODE_IDENTIFIER',
    );

    const key = `${RedisDataKey.KEYWORD_KEY2}-auction-summary-keyword-${keyword}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load auction_summary_keyword ${keyword} from Redis|${
          Date.now() - now
        }`,
      );

      result = true;
    } else {
      const auctionSummaryKeyword = await this.keywordNotificationModel
        .findOne({
          keyword_name: keyword,
          code_identifier: lov_id,
          notification_content: { $not: { $eq: '' } },
        })
        .lean();

      console.log(
        `REDIS|Load auction_summary_keyword ${keyword} from Database|${
          Date.now() - now
        }`,
      );

      if (auctionSummaryKeyword) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async process_bulk_redeem_coupon_confirmation_keyword(
    payload: RedeemDTO,
    account: any,
    token: any,
    tracing_id: string,
  ): Promise<any> {
    const now = Date.now();
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CONFIRMATION_CODE_IDENTIFIER',
    );
    const bulkKeyword = payload.keyword;
    const bulk_redeem_confirm_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: payload.keyword, code_identifier: lov_id })
      .lean();
    const parent_keyword = await this.keywordService.getKeywordByID(
      bulk_redeem_confirm_notif.keyword,
    );

    payload.keyword = parent_keyword.eligibility.name;
    payload.total_redeem = 0;
    payload.send_notification = true;

    return await this.redeem_v2(
      payload,
      tracing_id,
      account,
      token,
      'redeem2.bulk_redeem_coupon_confirmation',
    )
      .then(async (res) => {
        res.code = HttpStatusTransaction.ERR_KEYWORD_UTAMA_FOUND;
        res['payload']['keyword_bulk'] = bulkKeyword;
        res['payload']['keyword'].bonus = [
          {
            bonus_type: 'void',
            stock_location: [],
          },
        ];

        const reformatMsisdn = formatMsisdnCore(payload.msisdn);
        this.clientNotification.emit(process.env.KAFKA_VOID_TOPIC, {
          origin: 'redeem2.bulk_redeem_coupon_confirmation',
          keyword: parent_keyword,
          program: await this.programService.findProgramByIdWithRedis(
            parent_keyword.eligibility.program_id,
          ),
          token: token,
          payload: {
            void: {
              ignore: true,
              keyword: bulkKeyword,
            },
          },
          customer: await this.customerService
            .getCustomerByMSISDN(reformatMsisdn, token)
            .then(async (customerDetail) => customerDetail),
          tracing_id: tracing_id,
          tracing_master_id: tracing_id,
          incoming: {
            keyword: parent_keyword.eligibility.name,
            send_notification: true,
          },
        });

        return res;
      })
      .catch(async (e) => {
        this.logger.error({
          method: 'kafka',
          statusCode: HttpStatus.OK,
          transaction_id: payload.transaction_id,
          notif_customer: false,
          notif_operation: true,
          taken_time: Date.now() - now,
          param: payload,
          step: `Error Bulk redeem approval ${payload?.keyword.trim()}`,
          service: 'REDEEM',
          result: {
            msisdn: payload?.msisdn,
            url: 'redeem',
            user_id: new IAccount(account),
            result: e,
          },
        });
      });
  }

  async process_bulk_redeem_coupon_approval_keyword(
    payload: RedeemDTO,
    trace_id: string,
    response: any,
    account: Account,
    token = '',
    otp: string,
    kafkayPayload: any,
  ): Promise<any> {
    const now = Date.now();
    try {
      const msisdn = formatMsisdnCore(payload.msisdn);
      const o = await this.otpService.claimOTP(msisdn, otp);

      if (!o) {
        // emit to notification otp salah
        this.customLogger(payload, now, `Wrong OTP`);
        kafkayPayload.keyword = {
          eligibility: {
            program_title_expose: `YA ${otp}`,
          },
          notification: true,
        };

        kafkayPayload.customer = {
          msisdn: kafkayPayload.data.msisdn,
        };

        kafkayPayload.notification =
          await this.notifContentService.getNotificationTemplate(
            NotificationTemplateConfig.REDEEM_FAILED_INVALID_OTP,
            payload,
          );

        kafkayPayload.origin = `redeeem.redeem_fail`; // TODO
        kafkayPayload.incoming = kafkayPayload.data;
        kafkayPayload.tracing_id = kafkayPayload.transaction_id;
        kafkayPayload.tracing_master_id = kafkayPayload.transaction_id;
        this.customLogger(payload, now, `Emitting to notification`);
        await this.clientNotification.emit(
          process.env.KAFKA_NOTIFICATION_TOPIC,
          kafkayPayload,
        );
        return;
      }

      const total_point_owned =
        await this.pointService.getCustomerTselPointBalance(msisdn, token);
      const keyword = await this.keywordService.getKeywordByID(o.keyword);
      const total_redeem = Math.floor(
        Number(total_point_owned) / Number(keyword.eligibility.poin_redeemed),
      );

      payload.keyword = keyword.eligibility.name;
      payload.total_redeem = total_redeem;
      payload.send_notification = false;

      return await this.redeem_v2(payload, trace_id, account, token).then(
        async (res) => {
          res['payload']['keyword'].eligibility.poin_value = 'Fixed Multiple';
          res['is_coupon_bulk_approval'] = true;

          // below is only for notification "PARENT" only
          if (
            !payload?.additional_param?.hasOwnProperty('parent_transaction_id')
          ) {
            const reformatMsisdn = formatMsisdnCore(msisdn);
            this.customLogger(payload, now, `Emitting to void`);
            this.clientVoid.emit(process.env.KAFKA_VOID_TOPIC, {
              origin: 'redeem2.bulk_redeem_coupon_approval',
              keyword: keyword,
              program: await this.programService.findProgramByIdWithRedis(
                keyword.eligibility.program_id,
              ),
              payload: {
                void: {
                  ignore: true,
                },
              },
              customer: await this.customerService
                .getCustomerByMSISDN(reformatMsisdn, token)
                .then(async (customerDetail) => customerDetail),
              tracing_id: trace_id,
              tracing_master_id: trace_id,
              incoming: {
                keyword: keyword.eligibility.name,
                send_notification: true,
              },
            });
          }

          // final process
          this.emit_process(res, {
            path: kafkayPayload.path,
            token: kafkayPayload.token,
            data: payload,
            account,
            applicationService: this.applicationService,
            client: this.clientEligibility,
            origin: 'redeem',
            bulk_keyword: '',
            priority: kafkayPayload?.keyword_priority,
          });

          return res;
        },
      );
    } catch (e) {
      this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.OK,
        transaction_id: payload.transaction_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - now,
        param: payload,
        step: `Error Bulk redeem approval ${payload?.keyword.trim()}`,
        service: 'REDEEM',
        result: {
          msisdn: payload?.msisdn,
          url: 'redeem',
          user_id: new IAccount(account),
          result: {
            stack: e.stack,
            message: e.message,
          },
        },
      });
    }
  }

  async process_bulk_redeem_coupon_info_keyword(
    payload: RedeemDTO,
    trace_id: string,
    response: any,
    account: Account,
    token = '',
  ): Promise<any> {
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_INFO_CODE_IDENTIFIER',
    );
    const bulk_redeem_info_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: payload.keyword, code_identifier: lov_id })
      .lean();
    const parent_keyword = await this.keywordService.getKeywordByID(
      bulk_redeem_info_notif.keyword,
    );

    payload.keyword = parent_keyword.eligibility.name;
    payload.total_redeem = 0;
    payload.send_notification = false;

    return await this.redeem_v2(payload, trace_id, account, token).then(
      async (res) => {
        res['payload']['keyword'].eligibility.poin_value = 'Fixed';
        res['payload']['keyword'].eligibility.poin_redeemed = 0;
        const reformatMsisdn = formatMsisdnCore(payload.msisdn);
        this.clientNotification.emit(process.env.KAFKA_VOID_TOPIC, {
          origin: 'redeem2.bulk_redeem_coupon_info',
          keyword: parent_keyword,
          program: await this.programService.findProgramByIdWithRedis(
            parent_keyword.eligibility.program_id,
          ),
          payload: {
            void: {
              ignore: true,
            },
          },
          customer: await this.customerService
            .getCustomerByMSISDN(reformatMsisdn, token)
            .then(async (customerDetail) => customerDetail),
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          incoming: {
            keyword: parent_keyword.eligibility.name,
            send_notification: true,
          },
        });
        return res;
      },
    );
  }

  async process_bulk_redeem_coupon_check_keyword(
    payload: RedeemDTO,
    trace_id: string,
    response: any,
    account: Account,
    token = '',
  ): Promise<any> {
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CHECK_CODE_IDENTIFIER',
    );
    const bulk_redeem_check_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: payload.keyword, code_identifier: lov_id })
      .lean();
    const parent_keyword = await this.keywordService.getKeywordByID(
      bulk_redeem_check_notif.keyword,
    );

    payload.keyword = parent_keyword.eligibility.name;
    payload.total_redeem = 0;
    payload.send_notification = false;

    return await this.redeem_v2(payload, trace_id, account, token).then(
      async (res) => {
        res['payload']['keyword'].eligibility.poin_value = 'Fixed';
        res['payload']['keyword'].eligibility.poin_redeemed = 0;
        const reformatMsisdn = formatMsisdnCore(payload.msisdn);
        this.clientNotification.emit(process.env.KAFKA_VOID_TOPIC, {
          origin: 'redeem2.bulk_redeem_coupon_check',
          keyword: parent_keyword,
          program: await this.programService.findProgramByIdWithRedis(
            parent_keyword.eligibility.program_id,
          ),
          payload: {
            void: {
              ignore: true,
            },
          },
          customer: await this.customerService
            .getCustomerByMSISDN(reformatMsisdn, token)
            .then(async (customerDetail) => customerDetail),
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          incoming: {
            keyword: parent_keyword.eligibility.name,
            send_notification: true,
          },
        });
        return res;
      },
    );
  }

  async getVotingPayload(request, payload) {
    const additional_param = request?.additional_param;

    if (!additional_param) return null;

    return {
      keyword: payload['keyword'].eligibility.name,
      option: additional_param.vote_option,
      total_redeem: request?.total_redeem,
    };
  }

  private async processAuctionNotification(
    config: IAuctionNotification,
    notifTemplateType: NotificationTemplateConfig,
  ): Promise<void> {
    const startTime = Date.now();
    const { data: requestBody, keyword_name, origin, token, payload } = config;

    try {
      const keywordNotifications = await this.redeem_v2_notification({
        keyword: keyword_name,
      });
      const keywordNotif = keywordNotifications[0];

      if (keywordNotifications.length > 1) {
        console.log('More than one Notification Keyword!');
        throw new BadRequestException(
          'ProcessAuctionNotification - More than one Notification Keyword',
        );
      }

      if (
        !keywordNotif?.program_detail?.name &&
        !keywordNotif?.keyword_detail
      ) {
        console.log('Keyword not found');
        throw new BadRequestException(
          'ProcessAuctionNotification - Keyword not found',
        );
      }

      keywordNotif.code_identifier_detail['notification_template'] =
        notifTemplateType;

      const payloadToVoid = {
        origin: origin,
        msisdn: requestBody.msisdn,
        program_name: keywordNotif?.program_detail.name,
        token: token,
        incoming: requestBody,
        // tracing_id: response.transaction_id,
        // tracing_master_id: response.transaction_id,
        // transaction_id: response.transaction_id,
        keyword: keywordNotif?.keyword_detail,
        keyword_notification: keywordNotif,
        payload: {
          void: {
            keyword: keyword_name,
            ignore: true,
          },
        },
        customer: {
          msisdn: requestBody.msisdn,
        },
      };
      console.log('payloadToVoid', payloadToVoid);

      this.clientVoid.emit(process.env.KAFKA_VOID_TOPIC, payloadToVoid);
    } catch (error) {
      const { message } = error;

      console.log(`ERROR processAuctionNotification ${message}`);

      this.logger.error({
        method: 'kafka',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: payload.transaction_id,
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - startTime,
        param: payload,
        step: `processAuctionNotification occured error! Error: ${message}`,
        service: 'REDEEM',
        result: {
          msisdn: payload?.data?.msisdn,
          url: 'redeem',
          user_id: new IAccount(payload.account),
          result: {
            message: message,
            stack: error?.stack,
          },
        },
      });
    }
  }
}
