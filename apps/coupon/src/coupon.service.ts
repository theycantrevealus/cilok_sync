import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { msisdnCombineFormatted } from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { StockService } from '@/stock/services/stock.service';

import { CouponNotifTemplate } from './constants/coupon-notif-template';
import { InjectCouponService } from './service/inject.coupon.service';
import { CouponLogService } from './service/log.service';

@Injectable()
export class KafkaCouponService {
  private httpService: HttpService;
  private url: string;

  private coupon_prefix: string;
  private coupon_product: string;
  private realm: string;
  private branch: string;
  private merchant: string;

  constructor(
    private configService: ConfigService,
    private injectService: InjectCouponService,
    private appliactionService: ApplicationService,
    httpService: HttpService,
    private notifService: NotificationContentService,
    private stockService: StockService,
    private readonly keywordService: KeywordService,
    private readonly customerService: CustomerService,
    private readonly programService: ProgramServiceV2,

    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,
    @Inject('COUPON_SERVICE_PRODUCER')
    private readonly couponClient: ClientKafka,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    private readonly couponLogService: CouponLogService,
  ) {
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.httpService = httpService;

    this.coupon_prefix = `${configService.get<string>(
      'core-backend.coupon_prefix.id',
    )}`;
    this.coupon_product = `${configService.get<string>(
      'core-backend.coupon_product.id',
    )}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async process_inject_coupon(payload, coupon) {
    const startTime = new Date();

    await this.couponLogService.verbose(
      payload,
      {
        coupon: coupon,
      },
      `Start process_inject_coupon`,
      startTime,
    );

    try {
      if (payload.payload.mbp) {
        const mbp = payload.payload.mbp;
        await this.proses_coupon(mbp, payload);
      } else if (payload.payload.coupon) {
        await this.proses_coupon(coupon, payload);
      } else {
        await this.notification_coupon('Bonus type undefined', payload);
      }
    } catch (error) {
      console.log('---- error ----');
      console.log(error);

      await this.loggerCoupon(payload, error.message, startTime);
      await this.retry_coupon(error?.message, payload);
    }
  }

  async proses_coupon(coupon, payload) {
    const start = new Date();

    let tracing_id = payload.tracing_id.split('_');
    tracing_id[0] = 'CPN';
    tracing_id = tracing_id.join('_');

    await this.couponLogService.verbose(
      payload,
      {
        coupon: coupon,
      },
      `Start process_coupon ${tracing_id}`,
      start,
    );

    if (
      payload.keyword.eligibility.poin_value == 'Fixed Multiple' ||
      payload.keyword.eligibility.poin_value == 'Flexible'
    ) {
      coupon.transaction_no = tracing_id;
    } else {
      coupon.transaction_no = coupon.transaction_no
        ? coupon.transaction_no
        : tracing_id;
    }

    const splitOwner = payload.payload?.coupon?.owner_phone.split('|');
    const targetMSISDN =
      msisdnCombineFormatted(splitOwner[0]) +
      '|' +
      splitOwner[1] +
      '|' +
      splitOwner[2];

    await this.couponLogService.verbose(
      payload,
      {
        ...coupon,
        owner_phone: targetMSISDN,
      },
      `TANAKA ===> Check for msisdn format to core ${targetMSISDN}`,
      start,
    );

    // tambah transaction_vote
    let parent_transaction_id = payload.tracing_master_id;
    if (payload?.incoming?.additional_param) {
      const parse_additional_param = payload.incoming.additional_param;

      if (parse_additional_param?.parent_transaction_id) {
        parent_transaction_id = parse_additional_param.parent_transaction_id;
      }
    }

    const response = await this.injectService.push_to_core(
      {
        ...coupon,
        owner_phone: targetMSISDN,
      },
      payload.account,
      payload.token,
      {
        program_id: payload.program._id,
        program_name: payload.program.name,
        program_start: payload.program.start_period,
        program_end: payload.program.end_period,
        keyword_id: payload.keyword._id,
        keyword_name: payload.keyword.eligibility.name,
        msisdn: payload.incoming.msisdn,
        transaction_id: payload.tracing_master_id,
        parent_master_id: parent_transaction_id,
      },
    );

    await this.notification_coupon(
      null,
      payload,
      response?.code === 'S00000' ? false : true,
    );

    return response;
  }

  async retry_coupon(message: any, payload: any) {
    const start = new Date();

    await this.couponLogService.verbose(
      payload,
      {},
      `Start retry_coupon ${message}`,
      start,
    );

    // get config default from config
    const point_stopper = await this.appliactionService.getConfig(
      `DEFAULT_CONS_RETRY_INJECT_COUPON`,
    );

    if (
      payload.origin !==
      'redeem.eligibility_success.deduct_success.inject_coupon_fail'
    ) {
      const ORIGIN_NAME = 'inject_coupon';
      const origin_fail = payload.origin + '.' + ORIGIN_NAME + '_fail';
      payload.origin = origin_fail;
    }

    // if counter coupon is more than stopper counter from config
    if (payload.retry.coupon.counter >= point_stopper) {
      // send notification cause counter is more than limit
      await this.notification_coupon(
        'Stopped retrying, the counter is exceeds the limit',
        payload,
      );
    } else {
      // send to consumer coupon if condition config counter coupon is not fulfilled
      payload.retry.coupon.counter += 1; //default counter = 0, counter = counter + 1;
      payload.retry.coupon.errors = [...payload.retry.coupon.errors, message]; // Joining error messege

      this.couponClient.emit('coupon', payload);
    }
  }

  async notification_coupon(message: any, payload: any, fail = true) {
    const startTime = new Date();

    await this.couponLogService.verbose(
      payload,
      {},
      `Start notification_coupon ${message}`,
      startTime,
    );

    try {
      // Inisiate payload notification;
      payload.notification = [];

      const origin = payload.origin.split('.');

      if (fail) {
        const origin_refund = [
          'redeem.eligibility_success.deduct_success',
          'redeem.eligibility_success.deduct_success.inject_coupon_fail',
        ];

        if (origin_refund.includes(payload.origin)) {
          this.refundClient.emit('refund', payload);
        }

        payload.error_message = message;

        if (payload.payload.mbp || payload.payload.coupon) {
          payload.notification =
            await this.notifService.getNotificationTemplate(
              CouponNotifTemplate.REDEEM_FAILED,
              payload,
            );
        } else {
          payload.origin = payload.origin + '_fail';
          payload.notification =
            await this.notifService.getNotificationTemplate(
              CouponNotifTemplate.INJECT_COUPON_INVALID_ENPOINT,
              payload,
            );
        }
      } else {
        // payload set origin success
        const origin = payload.origin + '.' + 'inject_coupon_success';
        payload.origin = origin;

        // if (origin[0] === 'inject_coupon') {
        //   payload.notification = await this.notifService.getNotificationTemplate(
        //     CouponNotifTemplate.INJECT_COUPON_SUCCESS,
        //     payload,
        //   );
        // } else {
        payload.notification = await this.notifService.getNotificationTemplate(
          CouponNotifTemplate.REDEEM_SUCCESS,
          payload,
        );
        // }
      }

      if (payload.notification && payload.notification.length > 0) {
        if (
          payload.incoming.send_notification === undefined ||
          payload.incoming.send_notification !== false
        ) {
          payload.incoming.send_notification = true;
        }
      }

      this.notificationClient.emit(
        process.env.KAFKA_NOTIFICATION_TOPIC,
        payload,
      );
    } catch (error) {
      await this.loggerCoupon(payload, error.message, startTime);
    }
  }

  async loggerCoupon(payload, message, start) {
    await this.couponLogService.verbose(payload, {}, message, start);
  }

  async buildPayload(request: any, start) {
    const payload = await this.buildPayload2(request, start);
    if (payload === false) {
      return false;
    }

    // === START BONUS VALIDATION, 2024-07-25 ===
    let is_invalid_keyword = false;

    try {
      const keywordProfile = payload?.keyword;

      // fixed multiple validation
      const keywordType = keywordProfile?.eligibility?.poin_value;
      if (keywordType == 'Fixed Multiple') {
        is_invalid_keyword = true;
      }

      // multibonus validation
      const is_main_keyword = keywordProfile?.is_main_keyword != false;
      const is_multi_bonus =
        is_main_keyword && keywordProfile?.child_keyword?.length > 0;

      if (is_multi_bonus) {
        is_invalid_keyword = true;
      } else if (!is_main_keyword) {
        is_invalid_keyword = true;
      }
    } catch (err) {
      console.error(err);
      this.loggerCoupon(payload, 'An error occured bonus validation!', start);

      return await this.keywordError(
        payload,
        NotificationTemplateConfig.REDEEM_FAILED_GENERAL,
      );
    }

    this.loggerCoupon(
      payload,
      `Is INVALID Keyword (Not Applicable)? ${is_invalid_keyword}`,
      start,
    );

    // KEYWORD IS INVALID
    if (is_invalid_keyword) {
      return await this.keywordError(
        payload,
        NotificationTemplateConfig.REDEEM_FAILED_INVALID_KEYWORD,
      );
    }
    // === END BONUS VALIDATION, 2024-07-25 ===

    return payload;
  }

  async keywordError(payload, notificationGroup) {
    const request = {
      ...payload,
      notification: {},
    };

    request.notification = await this.notifService.getNotificationTemplate(
      notificationGroup,
      request,
    );

    request.origin = request.origin + `.inject_coupon_fail`;
    await this.notificationClient.emit(
      process.env.KAFKA_NOTIFICATION_TOPIC,
      request,
    );

    return false;
  }

  async buildPayload2(request: any, start) {
    // build payload
    if (request.keyword !== null && request.program !== null) {
      return request;
    } else {
      return await this.keywordService
        .findKeywordByNameWithRedis(request.incoming.keyword)
        .then(async (keyConf) => {
          if (keyConf) {
            let customer = { msisdn: request.incoming.msisdn };
            const reformatMsisdn = msisdnCombineFormatted(
              request.incoming.msisdn,
            );
            console.log(`Used token: ${request.token}`);
            customer = await this.customerService
              .getCustomerByMSISDN(reformatMsisdn, request.token)
              .then(async (customerDetail) => {
                console.log('customer', customerDetail);
                return customerDetail;
              })
              .catch((e) => {
                console.log(e);
                return { msisdn: request.incoming.msisdn };
              });
            const bonus = keyConf.bonus;
            let coupon = null;
            let mbp = null;
            if (bonus.length > 0) {
              for (const single_bonus of bonus) {
                switch (single_bonus.bonus_type) {
                  case 'lucky_draw':
                    coupon = await this.payload_to_coupon(
                      {
                        ...request,
                        keyword: keyConf,
                        customer,
                      },
                      single_bonus,
                      request.incoming,
                    );
                    break;
                  case 'mbp':
                    mbp = await this.payload_to_mbp(
                      {
                        ...request,
                        keyword: keyConf,
                        customer,
                      },
                      request.incoming,
                      single_bonus,
                    );
                  default:
                    break;
                }
              }
            }

            const program = await this.programService.findProgramByIdWithRedis(
              keyConf.eligibility.program_id,
            );
            if (program) {
              program['keyword-list'] = [];
            }

            const payload = {
              ...request,
              customer,
              keyword: keyConf,
              program,
              payload: {
                coupon,
                mbp,
              },
            };

            // === MODIFIED BY MULTIBONUS, 2024-08-02 ===
            // this.transactionMasterClient.emit(
            //   process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
            //   payload,
            // );

            let emitToTrxMaster = true;
            const currentTrxId = payload?.tracing_master_id;
            const parentTrxId =
              payload?.incoming?.additional_param?.parent_transaction_id;

            const bonusFlexibility = payload?.keyword?.bonus?.[0]?.flexibility;

            // parent trx detected? this is child trx
            if (parentTrxId) {
              // from inject_coupon API && bonus flexibility is Flexible?
              const origin = payload.origin.split('.');
              if (
                origin[0] == 'inject_coupon' &&
                bonusFlexibility == 'Flexible'
              ) {
                emitToTrxMaster = false;
              }
            }

            // console.log(
            //   currentTrxId,
            //   parentTrxId,
            //   bonusFlexibility,
            //   emitToTrxMaster,
            // );

            // emitToTrxMaster = true;
            if (emitToTrxMaster) {
              this.transactionMasterClient.emit(
                process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
                payload,
              );
            }
            // === END MODIFIED BY MULTIBONUS, 2024-08-02 ===

            return payload;
          } else {
            // keyword not found
            request.keyword = {
              eligibility: {
                program_title_expose: request.incoming.keyword,
              },
              notification: true,
            };

            request.notification =
              await this.notifService.getNotificationTemplate(
                NotificationTemplateConfig.REDEEM_FAILED_NOTFOUND_KEYWORD,
                request,
              );

            request.origin = request.origin + `.${request.origin}_fail`;
            await this.notificationClient.emit(
              process.env.KAFKA_NOTIFICATION_TOPIC,
              request,
            );
            return false;
          }
        })
        .catch((e) => {
          console.log(e);
          this.couponLogService.verbose(
            request,
            {},
            `Inject Coupon Build Payload Error`,
            start,
          );

          return false;
        });
    }
  }

  async payload_to_coupon(payload, bonus, request) {
    const merchant = payload.keyword.eligibility?.merchant
      ? await this.merchantModel.findById(
          payload?.keyword?.eligibility?.merchant,
        )
      : null;
    const date = new Date();

    const msisdn = payload['customer']?.msisdn
      ? payload['customer']?.msisdn
      : request?.msisdn;

    // TODO: add formating to replace 62 to 0
    return {
      locale: 'en-US',
      type: 'Coupon',
      transaction_no: payload['trace_id'],
      prefix: this.coupon_prefix ? this.coupon_prefix : 'CP',
      owner_phone: `${msisdnCombineFormatted(msisdn)}|ID|+62`,
      owner_id: payload['customer']?.core_id,
      owner_name: msisdn.replace('62', '0'),
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
      remark: payload?.keyword?.eligibility?.name,
      merchant_name: merchant?.merchant_name ? merchant?.merchant_name : 'SL',
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
      owner_phone: `${msisdnCombineFormatted(
        payload['customer'].msisdn,
      )}|ID|+62`,
      owner_id: payload['customer'].core_id,
      owner_name: payload['customer'].msisdn,
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
      merchant_name: merchant?.merchant_name ? merchant?.merchant_name : 'SL',
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
}
