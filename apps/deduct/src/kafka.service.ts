import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { LoggingRequest } from '@utils/logger/handler';
import { LoggingResult } from '@utils/logger/transport';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Logger } from 'winston';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { getMsisdnOnly } from '@/application/utils/Msisdn/formatter';
import { FMC_reformatMsisdnCore } from '@/application/utils/Msisdn/formatter';
import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { CustomerService } from '@/customer/services/customer.service';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { KeywordService } from '@/keyword/services/keyword.service';
import { LovService } from '@/lov/services/lov.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { ResponseDeduct } from './dtos/deduct.dto';
import { DeductPoint, DeductPointDocument } from './models/deduct.point.model';
import { MerchantService } from './services/merchant.service';

const moment = require('moment-timezone');

@Injectable()
export class KafkaService {
  private httpService: HttpService;
  private keywordService: KeywordService;
  private customerService: CustomerService;
  private lovService: LovService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  private is_indihome: boolean;
  constructor(
    @InjectModel(DeductPoint.name)
    private deductPointModel: Model<DeductPointDocument>,
    keywordService: KeywordService,
    private appliactionService: ApplicationService,
    private merchantService: MerchantService,
    private notifService: NotificationContentService,
    private transactionConfig: TransactionOptionalService,
    lovService: LovService,
    configService: ConfigService,
    customerService: CustomerService,
    httpService: HttpService,
    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeduct: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('INBOUND_SERVICE_PRODUCER')
    private readonly clientInbound: ClientKafka,
    @Inject('OUTBOUND_SERVICE_PRODUCER')
    private readonly clientOutbound: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefund: ClientKafka,
    @Inject('VOUCHER_SERVICE_PRODUCER')
    private readonly clientVoucher: ClientKafka,
    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly clientInjectPoint: ClientKafka,
    @Inject('INJECT_POINT_HIGH_SERVICE_PRODUCER')
    private readonly clientInjectPointHigh: ClientKafka,
    @Inject('DONATION_SERVICE_PRODUCER')
    private readonly clientDonation: ClientKafka,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly clientTrasactionMaster: ClientKafka,
    @Inject('COUPON_SERVICE_PRODUCER')
    private readonly clientCouponService: ClientKafka,
    @Inject('VOID_PRODUCER')
    private readonly clientVoid: ClientKafka,
    @Inject('MERCHANDISE_PRODUCER')
    private readonly clientMerchandise: ClientKafka,
    @Inject('REPORTING_POINT_EVENT_PRODUCER')
    private readonly clientReportingBI: ClientKafka,
    @Inject('VOTE_SERVICE_PRODUCER')
    private readonly clientVote: ClientKafka,
    @Inject('AUCTION_SERVICE_PRODUCER')
    private readonly clientAuction: ClientKafka,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
  ) {
    this.httpService = httpService;
    this.keywordService = keywordService;
    this.lovService = lovService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.customerService = customerService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
  }

  async point_deduct(payload): Promise<GlobalTransactionResponse> {
    const request = payload.incoming;
    const account = payload.account;
    const keyword = payload.keyword;
    const corePayload = payload.payload.deduct;
    const token = payload.token;
    const url = `${this.url}/redeem/inject`;

    // tracing_id change TRX to DDC
    // let tracing_id = payload.tracing_id.split('_');
    // tracing_id[0] = 'DDC';
    // tracing_id = tracing_id.join('_');
    const tracing_id = payload.tracing_id;

    // Add field parent_master_id
    let parent_transaction_id = payload.tracing_master_id;
    if (payload?.incoming?.additional_param) {
      const parse_additional_param = payload.incoming.additional_param;

      if (parse_additional_param?.parent_transaction_id) {
        parent_transaction_id = parse_additional_param.parent_transaction_id;
      }
    }

    if (corePayload.amount > 0) {
      corePayload.amount = corePayload.amount * -1;
    }

    corePayload.transaction_no = payload.tracing_id;

    if (keyword.eligibility.poin_value == 'Fixed Multiple') {
      corePayload.transaction_no = tracing_id;
    } else {
      corePayload.transaction_no = corePayload.transaction_no
        ? corePayload.transaction_no
        : tracing_id;
    }

    const origin = payload.origin.split('.');
    const req = request;

    const transaction_date = payload?.submit_time ? payload?.submit_time : '';

    req['parent_master_id'] = parent_transaction_id;
    req['tracing_id'] = tracing_id;
    req['master_id'] = payload?.tracing_master_id;
    req['remark'] = corePayload.remark;
    req['transaction_date'] = transaction_date;
    req['create_local_time'] = corePayload.create_local_time;
    req['total_point'] = Math.abs(corePayload.amount);

    if (origin[0] == 'redeem') {
      req['msisdn'] = request.msisdn;
      req['keyword'] = request.keyword;
      req['created_by'] = (account as any)._id;
    }

    console.log(`<== Tracing Log :: @${corePayload.transaction_no} ==>`);
    console.log('<--- Information :: Deduct Point Service --->');
    console.log('url_core : ', `${this.url}/redeem/inject`);
    console.log('token : ', token);
    console.log('<--- Information :: Deduct Point Service --->');

    if (corePayload.amount == 0) {
      console.log('=== DEDUCT AMOUNT 0 (a) ===');
      console.log(req);
      const response = new GlobalTransactionResponse();
      const newData = new this.deductPointModel(req);
      return await newData
        .save()
        .catch((e: BadRequestException) => {
          response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
          response.message = e?.message ?? 'Failed insert to collection';
          response.transaction_classify = 'DEDUCT_POINT';
          response.payload = {
            trace_id: tracing_id,
            transaction_no: corePayload.transaction_no,
            stack: e?.stack,
          };

          // Set Logging Failed
          this.logger_deduct({
            payload: payload,
            step: `Step :: Insert to collection with amount = 0`,
            message: 'Failed',
            stack: response.payload,
            is_success: false,
          });

          console.log('=== DEDUCT AMOUNT 0 (b) ===');

          return response;
        })
        .then(() => {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success insert to collection';
          response.transaction_classify = 'DEDUCT_POINT';
          response.payload = {
            trace_id: tracing_id,
            transaction_no: corePayload.transaction_no,
          };

          // Set Logging Success
          this.logger_deduct({
            payload: payload,
            step: `Step :: Insert to collection with amount = 0`,
            message: 'Success',
            stack: response.payload,
          });

          console.log('=== DEDUCT AMOUNT 0 (c) ===');

          return response;
        });
    } else {
      console.log('<--- Payload to Core :: Deduct Point Service --->');
      console.log(corePayload);
      console.log('<--- Payload to Core :: Deduct Point Service --->');

      return await lastValueFrom(
        this.httpService
          .post(`${this.url}/redeem/inject`, corePayload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
          })
          .pipe(
            map(async (res) => {
              const data = res.data;

              req['responseBody'] = data;
                
              const traceIdCombine = payload.payload?.tsel_id ? payload.payload?.tsel_id?.deduct_original?.transaction_no : tracing_id;
              const newData = new this.deductPointModel(req);
              const response = new GlobalTransactionResponse();
              return await newData
                .save()
                .catch((e: BadRequestException) => {
                  // throw new BadRequestException(e.message); //Error untuk mongoose
                  response.code =
                    HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
                  response.message =
                    e?.message ?? 'Failed insert to collection';
                  response.transaction_classify = 'DEDUCT_POINT';
                  response.payload = {
                    trace_id: traceIdCombine,
                    transaction_no: data.payload.trx_no,
                    stack: e?.stack,
                  };

                  // Set Logging Failed
                  this.logger_deduct({
                    payload: payload,
                    step: `Step :: Insert to collection & Process to deduct core`,
                    message:
                      'Insert to collection fail & process to deduct core is success',
                    stack: response.payload,
                    is_success: false,
                  });

                  return response;
                })
                .then(() => {
                  response.code = HttpStatusTransaction.CODE_SUCCESS;
                  response.message = 'Success insert to collection';
                  response.transaction_classify = 'DEDUCT_POINT';
                  response.payload = {
                    trace_id: traceIdCombine,
                    transaction_no: data.payload.trx_no,
                    member_id: corePayload.member_id,
                    core: data,
                    v: corePayload.__v,
                  };

                  // Set Logging Success
                  this.logger_deduct({
                    payload: payload,
                    step: `Step :: Insert to collection & Process to deduct core`,
                    message:
                      'Insert to collection & process to deduct core is success',
                    stack: response.payload,
                  });

                  return response;
                });
            }),
            catchError(async (e) => {
              const rsp = e?.response;
              console.log(
                '<--- Response from Core :: fail :: Deduct Point Service --->',
              );
              console.log('Status Code : ', rsp.status);
              console.log('Status Text : ', rsp.statusText);
              console.log('Data : ', rsp.data);
              console.log(
                '<--- Response from Core :: fail :: Deduct Point Service --->',
              );

              const response = new GlobalTransactionResponse();
              response.code =
                e?.response?.data.code ??
                HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
              response.message =
                rsp.status === 403 ? rsp.statusText : e?.response?.data.message;
              response.transaction_classify = 'DEDUCT_POINT';
              response.payload = {
                trace_id: tracing_id,
                core: {
                  request: corePayload,
                  header: {
                    url: url,
                    token: token,
                  },
                  response: {
                    data: rsp?.data,
                    status: rsp?.status,
                    statusText: rsp?.statusText,
                    message: e?.response?.data.message,
                  },
                },
              };

              // Set Logging Failed
              this.logger_deduct({
                payload: payload,
                step: `Step :: Insert to collection & Process to deduct core`,
                message: e?.message,
                stack: response.payload,
                is_success: false,
              });

              return response;
            }),
          ),
      );
    }
  }

  async integration_deduct_point_priority(payload) {
    if (payload?.keyword_priority === 'HIGH') {
      this.clientInjectPointHigh.emit(
        process.env.KAFKA_INJECT_POINT_HIGH_TOPIC,
        payload,
      );
      // } else if (payload?.keyword_priority === 'LOW') {
      //   this.clientInjectPoint.emit(
      //     process.env.KAFKA_INJECT_POINT_LOW_TOPIC,
      //     payload,
      //   );
    } else {
      this.clientInjectPoint.emit(
        process.env.KAFKA_INJECT_POINT_TOPIC,
        payload,
      );
    }
  }

  async integration_deduct(payload: any, response: any = {}) {
    const bonus = payload.keyword.hasOwnProperty('bonus')
      ? payload.keyword.bonus
      : 0;
    payload.origin = payload.origin + '.' + 'deduct_success';

    if (bonus.length > 0) {
      // Validation outbound key
      const outbound = bonus.filter(
        (e) =>
          e.bonus_type == 'telco_prepaid' ||
          e.bonus_type == 'telco_postpaid' ||
          e.bonus_type == 'ngrs' ||
          e.bonus_type == 'linkaja' ||
          e.bonus_type == 'linkaja_main' ||
          e.bonus_type == 'linkaja_bonus' ||
          e.bonus_type == 'linkaja_voucher',
      );
      if (outbound.length > 0) {
        console.log('emit to outbound');
        // Send to outbound
        this.clientOutbound.emit(process.env.KAFKA_OUTBOUND_TOPIC, payload);
      } else {
        console.log('not to outbound');
        bonus.forEach(async (e) => {
          const bonusType = e.bonus_type;
          switch (bonusType) {
            case 'discount_voucher':
              this.clientVoucher.emit(process.env.KAFKA_VOUCHER_TOPIC, payload);
              break;
            case 'loyalty_poin':
              this.integration_deduct_point_priority(payload);
              break;
            case 'mbp':
              this.clientCouponService.emit(
                process.env.KAFKA_COUPON_TOPIC,
                payload,
              );
              break;
            case 'lucky_draw':
              this.clientCouponService.emit(
                process.env.KAFKA_COUPON_TOPIC,
                payload,
              );
              break;
            case 'void':
              this.clientVoid.emit(process.env.KAFKA_VOID_TOPIC, payload);
              break;
            case 'direct_redeem':
              this.clientMerchandise.emit(
                process.env.KAFKA_MERCHANDISE_TOPIC,
                payload,
              );
              break;
            case 'donation':
              this.clientDonation.emit(
                process.env.KAFKA_DONATION_TOPIC,
                payload,
              );
              break;
            case 'voting':
              this.clientVote.emit(process.env.KAFKA_VOTE_TOPIC, payload);
              break;
            case 'e_auction':
              this.clientAuction.emit(process.env.KAFKA_AUCTION_TOPIC, payload);
              break;
            case 'sms_auction':
              this.clientAuction.emit(process.env.KAFKA_AUCTION_TOPIC, payload);
              break;
            default:
              // Send to inbound
              this.clientInbound.emit(process.env.KAFKA_INBOUND_TOPIC, payload);
          }
        });
      }
    } else {
      const logMessage: LoggingResult = {
        step: 'INTEGRATION DEDUCT',
        message: 'Bonus not found',
      };

      // if bonus not found on keyword
      const msg = 'Bonus not found';
      const deduct = payload.payload.deduct;

      if (
        payload.eligibility.poin_value != 'Fixed' &&
        payload?.poin_changed != 0
      ) {
        const refund_payload = payload;
        const refund = await this.merchantService
          .getMerchantSelf(refund_payload.token)
          .then((e) => {
            const pin = e.payload.merchant_config.authorize_code.refund;

            return {
              locale: deduct.locale,
              transaction_no: response.payload.transaction_no,
              type: deduct.type,
              reason: msg,
              channel: deduct.channel,
              reward_item_id: deduct?.reward_item_id,
              reward_instance_id: deduct?.reward_instance_id,
              remark: deduct.remark,
              authorize_pin: pin,
              member_id: response.payload.member_id,
              realm_id: deduct.realm_id,
              branch_id: deduct.branch_id,
              merchant_id: deduct.merchant_id,
              __v: 0,
            };
          })
          .catch((e) => {
            logMessage.message = 'Failed getMerchantSelf';
            logMessage.data = e?.stack;
          });

        refund_payload.payload.refund = refund;

        refund_payload.incoming.ref_transaction_id =
          response.payload.transaction_no;
        delete refund_payload.incoming.total_redeem;
        delete refund_payload.incoming.redeem_type;
        delete refund_payload.incoming.adn;
        delete refund_payload.incoming.send_notification;

        logMessage.data = refund_payload.incoming;

        // send to consumer refund
        this.clientRefund.emit('refund', refund_payload);
      } else {
        logMessage.message = 'Bonus not found & amount < 0';
      }

      // send to consumer notification
      this.notification_deduct(logMessage, payload);
    }
  }

  async integration_deduct_fmc(payload: any, response: any = {}) {
    const bonus = payload.keyword.hasOwnProperty('bonus')
      ? payload.keyword.bonus
      : 0;
    payload.origin = payload.origin + '.' + 'deduct_success';

    if (bonus.length > 0) {
      // Validation outbound key
      const outbound = bonus.filter(
        (e) =>
          e.bonus_type == 'telco_prepaid' ||
          e.bonus_type == 'telco_postpaid' ||
          e.bonus_type == 'ngrs' ||
          e.bonus_type == 'linkaja' ||
          e.bonus_type == 'linkaja_main' ||
          e.bonus_type == 'linkaja_bonus' ||
          e.bonus_type == 'linkaja_voucher',
      );
      if (outbound.length > 0) {
        console.log('emit to outbound');
        // Send to outbound
        this.clientOutbound.emit('outbound', payload);
      } else {
        console.log('not to outbound');
        for (const e of bonus) {
          const bonusType = e.bonus_type;
          switch (bonusType) {
            case 'discount_voucher':
              this.clientVoucher.emit('voucher', payload);
              break;
            case 'loyalty_poin':
              console.log('loyalti_poin');
              await this.clientInjectPoint.emit('inject_point', payload);
              break;
            case 'mbp':
              this.clientCouponService.emit('coupon', payload);
              break;
            case 'lucky_draw':
              this.clientCouponService.emit('coupon', payload);
              break;
            case 'void':
              this.clientVoid.emit('void', payload);
              break;
            case 'direct_redeem':
              this.clientMerchandise.emit('merchandise', payload);
              break;
            case 'donation':
              this.clientDonation.emit('donation', payload);
              break;
            default:
              // Send to inbound
              this.clientInbound.emit('inbound', payload);
          }
        }
      }
    } else {
      await this.refundProcess(payload, 'Bonus not found');
    }
  }

  async retry_deduct(message: any, payload: any) {
    // set point stopper default
    let point_stopper_default = 1;

    // get config default from config
    let point_stopper = await this.appliactionService.getConfig(
      'DEFAULT_CONS_RETRY_DEDUCT_POINT',
    );

    // set point stopper default if poin value is Fixed Multiple
    if (payload.keyword.eligibility.poin_value === 'Fixed Multiple') {
      point_stopper_default = 1;
    }

    point_stopper = point_stopper ? point_stopper : point_stopper_default;

    const origin_fail = payload.origin + '.' + 'deduct_fail';
    payload.origin = origin_fail;

    // if counter deduct is more than stopper counter from config
    if (payload.retry?.deduct?.counter >= point_stopper) {
      // send notification cause counter is more than limit
      message.message = 'Stopped retrying, the counter is exceeds the limit';
      this.notification_deduct(message, payload);
    } else {
      // send to consumer deduct if condition config counter deduct is not fulfilled
      payload.retry.deduct.counter += 1; //default counter = 0, counter = counter + 1;
      payload.retry.deduct.errors = [...payload.retry.deduct.errors, message]; // Joining error messege
      this.clientDeduct.emit(process.env.KAFKA_DEDUCT_TOPIC, payload);
    }
  }
  async retry_deduct_fmc(message: any, payload: any) {
    // set point stopper default
    let point_stopper_default = 1;

    // get config default from config
    let point_stopper = await this.appliactionService.getConfig(
      'DEFAULT_CONS_RETRY_DEDUCT_POINT',
    );

    // set point stopper default if poin value is Fixed Multiple
    if (payload.keyword.eligibility.poin_value === 'Fixed Multiple') {
      point_stopper_default = 1;
    }

    point_stopper = point_stopper ? point_stopper : point_stopper_default;

    const origin_fail = payload.origin + '.' + 'deduct_fail';
    payload.origin = origin_fail;

    // if counter deduct is more than stopper counter from config
    if (payload.retry?.deduct?.counter >= point_stopper) {
      // send notification cause counter is more than limit
      message.message = 'Stopped retrying, the counter is exceeds the limit';
      const deductSuccess = payload?.payload?.tsel_id?.deduct_success;
      if (deductSuccess?.length > 0) {
        await this.refundProcess(payload, 'Deduct Fail');
      }
      await this.notification_deduct(message, payload);
    } else {
      // send to consumer deduct if condition config counter deduct is not fulfilled
      payload.retry.deduct.counter += 1; //default counter = 0, counter = counter + 1;
      payload.retry.deduct.errors = [...payload.retry.deduct.errors, message]; // Joining error messege
      this.clientDeduct.emit('deduct', payload);
    }
  }

  async notification_deduct(
    response: any,
    payload: any,
    fail = true,
    notification_template: string = null,
  ) {
    const step = response?.hasOwnProperty('step')
      ? response?.step
      : 'Deduct Process';
    const message = response?.hasOwnProperty('message')
      ? response?.message
      : response ?? '';

    try {
      if (fail) {
        // payload set origin success
        const origin = payload.origin + '.' + 'deduct_fail';
        payload.origin = origin;
        payload.error_message = response;
        payload.is_stock_deducted = true;

        if (notification_template) {
          payload.notification =
            await this.notifService.getNotificationTemplate(
              notification_template,
              payload,
            );
        } else {
          payload.notification =
            await this.notifService.getNotificationTemplate(
              NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
              payload,
            );
        }

        // Set Logging Failed
        this.logger_deduct({
          payload: payload,
          step: `Step :: ${step}`,
          message: message,
          stack: response,
          is_success: false,
        });
      } else {
        // payload set origin success
        const origin = payload.origin + '.' + 'deduct_success';
        payload.origin = origin;

        if (notification_template) {
          payload.notification =
            await this.notifService.getNotificationTemplate(
              notification_template,
              payload,
            );
        } else {
          payload.notification =
            await this.notifService.getNotificationTemplate(
              NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
              payload,
            );
        }

        // Set Logging Success
        this.logger_deduct({
          payload: payload,
          step: `Step :: ${step}`,
          message: message,
          stack: response,
        });
      }

      /**
       * jika bonus type e_auction / sms_auction
       * maka lanjut ke auction
       */
      const isBonusAuction = payload?.keyword?.bonus.find(
        (bonus) =>
          bonus.bonus_type === 'e_auction' ||
          bonus.bonus_type === 'sms_auction',
      );
      if (fail && isBonusAuction) {
        this.notificationClient.emit(process.env.KAFKA_AUCTION_TOPIC, payload);
      } else {
        this.notificationClient.emit(
          process.env.KAFKA_NOTIFICATION_TOPIC,
          payload,
        );
      }
    } catch (error) {
      // Set Logging Failed
      this.logger_deduct({
        payload: payload,
        step: 'Step :: Send Notification',
        message: 'Catch :: Send notification deduct fail',
        stack: error?.stack,
        is_success: false,
      });
    }
  }

  async checking_point_balance(payload: any) {
    // <-- check indihome -->
    const indihome_name = await this.applicationService.getConfig('INDIHOME');
    this.is_indihome =
      payload?.incoming?.identifier_type?.toUpperCase() === indihome_name;
    // <-- end check indihome -->

    console.log('==== POINT BALANCE OPEN ====');
    const program = payload.program;
    const request = payload.incoming;
    const deductPayload = payload.payload.deduct;
    const token = payload.token;
    const poin_redeemed =
      payload?.poin_changed ?? payload.keyword.eligibility.poin_redeemed;
    const poin_value = payload.keyword.eligibility.poin_value;
    let amount = deductPayload.amount;
    const point_balance = 0;

    // set var logging
    const logMessage: LoggingResult = {
      step: 'CHECKING POINT BALANCE',
    };

    if (payload.origin.split('.')[0] == 'redeem') {
      amount = await validationKeywordPointValueRule(payload);

      /** Take out : 2024-07-01 **/
      // if (poin_value == 'Fixed Multiple') {
      //   if (payload.rule.fixed_multiple.counter > 0) {
      //     amount = poin_redeemed;
      //   } else {
      //     console.log('<== Request Payload :: Fixed Multiple ==> ');
      //     console.log(request);
      //     const total_redeem = request?.total_redeem ?? 1;
      //     console.log('total_redeem : ', total_redeem);
      //     amount = total_redeem * poin_redeemed;
      //     console.log('amount after condition : ', amount);
      //     console.log('<== Request Payload :: Fixed Multiple ==> ');
      //   }
      // }
      /** Take out : 2024-07-01 **/

      if (amount === 0 || amount === '0') {
        console.log('==== POINT BALANCE CLOSE ====');
        return [true, point_balance, payload];
      }
    }
    const reformatMsisdn = FMC_reformatMsisdnCore(request.msisdn);

    const { _id, set_value: bucket_type } = await this.lovService.getLovData(
      program?.point_type,
    );

    if (_id) {
      let point_balance = 0;

      // check_member_core
      try {
        const data: any = await this.customerService.check_member_core(
          reformatMsisdn,
          token,
          deductPayload.reward_item_id,
        );

        deductPayload.member_id = deductPayload.member_id
          ? deductPayload.member_id
          : data?.member_core_id;
        deductPayload.__v =
          data?.__v || data?.__v >= 0 ? data.__v : deductPayload.__v;
        point_balance = data.balance;
      } catch (data_fail) {
        console.log('<-- fatal :: fail check member core -->');

        deductPayload.member_id = deductPayload.member_id
          ? deductPayload.member_id
          : data_fail?.member_core_id;

        // set payload exception
        console.log(data_fail);
        logMessage.data = data_fail;
      }

      payload.payload.deduct = deductPayload;
      console.log('AMOUNT = ', amount);
      console.log('BALANCE = ', point_balance);

      if (point_balance) {
        if (amount > point_balance) {
          console.log('EXPECT = ', 'Point balance not enough');
          logMessage.message = `Point balance not enough, current balance ${point_balance}, poin redeemed ${amount}`;
          this.notification_deduct(
            logMessage,
            payload,
            true,
            NotificationTemplateConfig.REDEEM_FAILED_INSUFFICIENT_BALANCE,
          );
          console.log('==== POINT BALANCE CLOSE ====');
          return [false, point_balance, payload];
        }
      } else {
        console.log(
          'point balance not found or undefined | cannot get point balance',
        );
        logMessage.message = `Point balance not found or undefined | Cannot get point balance`;
        this.notification_deduct(
          logMessage,
          payload,
          true,
          NotificationTemplateConfig.REDEEM_FAILED_INSUFFICIENT_BALANCE,
        );
        console.log('==== POINT BALANCE CLOSE ====');
        return [false, point_balance, payload];
      }
    } else {
      logMessage.message = 'Point type not found';
      this.notification_deduct(
        logMessage,
        payload,
        true,
        NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
      );
      console.log('==== POINT BALANCE CLOSE ====');
      return [false, point_balance, payload];
    }

    console.log('==== POINT BALANCE CLOSE ====');
    return [true, point_balance, payload];
  }

  async logger_deduct(request: LoggingRequest) {
    // Set Request Validator Logging
    const result_default = {
      message: '-',
      stack: {},
    };

    result_default['message'] = request?.message;
    result_default['stack'] = request?.stack;

    request.payload = request?.payload ?? {};
    request.date_now = request?.date_now ?? Date.now();
    request.is_success = request?.is_success ?? true;
    request.step = request?.step ?? '';
    request.message = request?.message ?? '-';
    request.statusCode =
      request?.statusCode ?? request?.is_success
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
    request.result = request?.result ? request?.result : result_default;
    request.status_trx = request.status_trx ?? '-';
    // Set Request Validator Logging

    const transaction_id = request.payload?.tracing_master_id;
    const account = request.payload?.account;
    const statusCode = request.statusCode;
    const url = request.payload?.endpoint;
    const msisdn = request.payload?.incoming?.msisdn;
    const param = {
      status_trx: request.status_trx,
      origin: request.payload.origin,
      incoming: request.payload?.incoming,
      token: request.payload?.token,
      endpoint: request.payload?.endpoint,
      keyword: {
        eligibility: {
          name: request.payload?.keyword?.eligibility?.name,
          poin_value: request.payload?.keyword?.eligibility?.poin_value,
          poin_redeemed: request.payload?.keyword?.eligibility?.poin_redeemed,
        },
      },
      program: {
        name: request.payload?.program?.name,
      },
      account: account,
      notification: request.payload?.notification,
    };

    const logData: any = {
      method: 'kafka',
      statusCode: statusCode,
      transaction_id: transaction_id,
      notif_customer: false,
      notif_operation: false,
      taken_time: Date.now() - request.date_now,
      step: request.step,
      param: param,
      service: 'DEDUCT',
      result: {
        msisdn: msisdn,
        url: url,
        result: request.result,
      },
    };

    if (request.is_success) {
      this.logger.verbose(logData);
    } else {
      this.logger.error(logData);
    }
  }

  async push_to_core_deduct(
    corePayload: any,
    token: string,
    payload_kafka: any,
  ): Promise<ResponseDeduct> {
    const response: ResponseDeduct = {
      status: false,
      message: 'Failed',
      statusCode: 'E00000',
      data: null,
    };

    const url = `${this.url}/redeem/inject`;
    const options = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    console.log(
      `<-- Tracing Log :: @${corePayload?.transaction_no} :: start -->`,
    );
    console.log('<--- Information :: Deduct Point Service --->');
    console.log('payload :', corePayload);
    console.log('url_core :', url);
    console.log('token : ', token);
    console.log('<--- Information :: Deduct Point Service --->');
    console.log(
      `<-- Tracing Log :: @${corePayload?.transaction_no} :: end -->`,
    );

    return await lastValueFrom(
      this.httpService.post(url, corePayload, options).pipe(
        map(async (res) => {
          const data = res.data;
          response.statusCode = data?.code ?? response.statusCode;
          response.status = data?.code == 'S00000' ? true : false;
          response.message = data?.message;
          response.data = data?.payload;

          console.log(
            '<--- Response from Core :: success :: push_to_core_deduct --->',
          );
          console.log(response);
          console.log(
            '<--- Response from Core :: success :: push_to_core_deduct --->',
          );

          // Set Logging Success
          this.logger_deduct({
            payload: payload_kafka,
            step: 'Step :: Process to deduct core',
            message: 'Process deduct core is success',
            stack: response,
          });

          return response;
        }),
        catchError(async (e) => {
          const rsp = e?.response;

          console.log(
            '<--- Response from Core :: fail :: push_to_core_deduct --->',
          );
          console.log('Status Code : ', rsp?.status);
          console.log('Status Text : ', rsp?.statusText);
          console.log('Data : ', rsp?.data);
          console.log(
            '<--- Response from Core :: fail :: push_to_core_deduct --->',
          );

          response.message = rsp?.statusText;
          response.data = rsp?.data;

          // Set Logging Failed
          this.logger_deduct({
            payload: payload_kafka,
            step: 'Step :: Process to deduct core',
            message: 'Process deduct core is failed',
            stack: response,
            is_success: false,
          });

          return response;
        }),
      ),
    );
  }

  async integration_deduct_v2(payload: any) {
    const bonus = payload.keyword.hasOwnProperty('bonus')
      ? payload.keyword.bonus
      : 0;
    payload.origin = payload.origin + '.' + 'deduct_success';

    if (bonus.length > 0) {
      // Validation outbound key
      const outbound = bonus.filter(
        (e) =>
          e.bonus_type == 'telco_prepaid' ||
          e.bonus_type == 'telco_postpaid' ||
          e.bonus_type == 'ngrs' ||
          e.bonus_type == 'linkaja' ||
          e.bonus_type == 'linkaja_main' ||
          e.bonus_type == 'linkaja_bonus' ||
          e.bonus_type == 'linkaja_voucher',
      );
      if (outbound.length > 0 && !this.is_indihome) {
        console.log('emit to outbound/bonus_external');
        // Send to outbound if msisdn is not indihome number
        this.clientOutbound.emit('outbound', payload);
      } else {
        console.log('emit to each bonus');
        bonus.forEach(async (e) => {
          const bonusType = e.bonus_type;
          switch (bonusType) {
            case 'discount_voucher':
              this.clientVoucher.emit(process.env.KAFKA_VOUCHER_TOPIC, payload);
              break;
            case 'loyalty_poin':
              await this.clientInjectPoint.emit(
                process.env.KAFKA_INJECT_POINT_TOPIC,
                payload,
              );
              break;
            case 'mbp':
              this.clientCouponService.emit(
                process.env.KAFKA_COUPON_TOPIC,
                payload,
              );
              break;
            case 'lucky_draw':
              this.clientCouponService.emit(
                process.env.KAFKA_COUPON_TOPIC,
                payload,
              );
              break;
            case 'void':
              this.clientVoid.emit(process.env.KAFKA_VOID_TOPIC, payload);
              break;
            case 'direct_redeem':
              this.clientMerchandise.emit(
                process.env.KAFKA_MERCHANDISE_TOPIC,
                payload,
              );
              break;
            case 'donation':
              this.clientDonation.emit(
                process.env.KAFKA_DONATION_TOPIC,
                payload,
              );
              break;
            case 'voting':
              this.clientVote.emit(process.env.KAFKA_VOTE_TOPIC, payload);
              break;
            default:
              // Send to inbound
              this.clientInbound.emit(process.env.KAFKA_INBOUND_TOPIC, payload);
          }
        });
      }
    } else {
      const logMessage: LoggingResult = {
        step: 'INTEGRATION DEDUCT',
        message: 'Bonus not found',
      };

      // if bonus not found on keyword
      const msg = 'Bonus not found';
      const deduct = payload.payload.deduct;

      // reconvert negative to positive
      const positive_amount = Math.abs(deduct.amount);

      if (positive_amount > 0) {
        logMessage.message = 'Refund cause bonus not found';
        const refund_payload = payload;
        const refund = await this.merchantService
          .getMerchantSelf(refund_payload.token)
          .then((e) => {
            const pin = e.payload.merchant_config.authorize_code.refund;

            return {
              locale: deduct.locale,
              transaction_no: deduct.transaction_no,
              type: deduct.type,
              reason: msg,
              channel: deduct.channel,
              reward_item_id: deduct?.reward_item_id,
              reward_instance_id: deduct?.reward_instance_id,
              remark: deduct.remark,
              authorize_pin: pin,
              member_id: deduct.member_id,
              realm_id: deduct.realm_id,
              branch_id: deduct.branch_id,
              merchant_id: deduct.merchant_id,
              __v: 0,
            };
          })
          .catch((e) => {
            logMessage.message = 'Failed getMerchantSelf';
            logMessage.data = e?.stack;
          });

        refund_payload.payload.refund = refund;

        refund_payload.incoming.ref_transaction_id = deduct.transaction_no;
        delete refund_payload.incoming.total_redeem;
        delete refund_payload.incoming.redeem_type;
        delete refund_payload.incoming.adn;
        delete refund_payload.incoming.send_notification;

        logMessage.data = refund_payload.incoming;

        // send to consumer refund
        this.clientRefund.emit(process.env.KAFKA_REFUND_TOPIC, refund_payload);
      } else {
        logMessage.message = 'Bonus not found & amount < 0';
      }

      // send to consumer notification
      this.notification_deduct(logMessage, payload);
    }
  }

  async fixed_multiple_deduct_process(
    payload: any,
    response_core: any = null,
    point_loop = 1,
  ) {
    // set variable
    const request = payload.incoming;
    const eligibility = payload.keyword.eligibility;
    const account = payload.account;
    const corePayload = payload.payload.deduct;
    const token = payload.token;
    const transaction_id = payload?.tracing_master_id;
    const transaction_date = payload?.submit_time ? payload?.submit_time : '';

    // set expected point for max loop recursive, default = 1
    let expected_point = 1;
    // if param total_redeem not exist
    if (request.hasOwnProperty('total_redeem')) {
      if (request.total_redeem > 0) {
        expected_point = request.total_redeem;
      }
    }

    // condition max loop
    if (point_loop <= expected_point) {
      // set transaction_no with added number loop
      corePayload.transaction_no = payload?.tracing_master_id;
      corePayload.transaction_no = `${corePayload?.transaction_no}_${point_loop}`;
      corePayload.__v =
        point_loop > 1 ? response_core?.data?.wallet?.__v : corePayload.__v;
      corePayload.amount = payload?.poin_changed;

      // convert positive amount to negative
      if (corePayload.amount > 0) {
        corePayload.amount = corePayload.amount * -1;
      }

      // set to payload
      payload.payload.deduct = corePayload;
      payload.tracing_id = corePayload.transaction_no;

      // set counter
      payload.rule.fixed_multiple.counter = point_loop;

      // set transactions
      payload.rule.fixed_multiple.transactions = [
        ...payload.rule.fixed_multiple.transactions,
        corePayload.transaction_no,
      ];

      // try exception if condition error
      try {
        console.log(
          `<--- fixed_multiple_deduct_process :: in progress :: ${transaction_id} :: on loop #${point_loop} :: start --->`,
        );
        // trigger to api core deduct
        const deduct = await this.push_to_core_deduct(
          corePayload,
          token,
          payload,
        );

        // set message
        payload.rule.fixed_multiple.message = [
          ...payload.rule.fixed_multiple.message,
          deduct.message,
        ];

        // set status
        payload.rule.fixed_multiple.status = [
          ...payload.rule.fixed_multiple.status,
          deduct.status,
        ];

        //please
        payload.tracing_id = `${transaction_id}_${payload.rule.fixed_multiple.status.length}`;
        payload.payload.deduct.transaction_no = payload.tracing_id;

        if (deduct.status) {
          // set counter success
          payload.rule.fixed_multiple.counter_success = point_loop;

          // continue to integration for each bonus
          await this.integration_deduct_v2(payload);

          // prepare payload for collection transaction_deduct
          const request_custom = { ...payload.incoming };
          request_custom['tracing_id'] = corePayload.transaction_no;
          request_custom['master_id'] = transaction_id;
          request_custom['remark'] = corePayload.remark;
          request_custom['msisdn'] = request.msisdn;
          request_custom['keyword'] = request.keyword;
          request_custom['created_by'] = (account as any)._id;
          request_custom['responseBody'] = deduct.data;
          request_custom['transaction_date'] = transaction_date;
          request_custom['total_point'] = Math.abs(corePayload.amount);

          //save to collection transaction_deduct
          await this.save_to_local_collection(request_custom, payload);
        } else {
          // set counter fail
          payload.rule.fixed_multiple.counter_fail = point_loop;

          // loggin when deduct core is fail
          const logMessage: LoggingResult = {
            step: 'FIXED MULTIPLE - DEDUCT PROCESS TO CORE',
            data: {
              message: deduct.message,
              response_core: deduct,
            },
            message: `fixed multiple - deduct process :: fail :: on loop #${point_loop}`,
          };
          this.notification_deduct(logMessage, payload);

          // set version
          deduct.status = false;
          deduct.message = 'failed';
          deduct.data = {
            ...deduct.data,
            wallet: {
              __v: corePayload.__v,
            },
          };
        }

        console.log(payload.rule.fixed_multiple);
        console.log(
          `<--- fixed_multiple_deduct_process :: in progress :: ${transaction_id} :: on loop #${point_loop} :: end --->`,
        );

        // trigger recursive function
        await this.fixed_multiple_deduct_process(
          payload,
          deduct,
          point_loop + 1,
        );
        return deduct;
      } catch (error) {
        // catch information data from api core deduct
        console.log(
          `<--- fixed_multiple_deduct_process :: fail :: ${transaction_id} :: on loop #${point_loop} --->`,
        );
        console.log(error);
        console.log(
          `<--- fixed_multiple_deduct_process :: fail :: ${transaction_id} :: on loop #${point_loop} --->`,
        );

        // set message
        payload.rule.fixed_multiple.message = [
          ...payload.rule.fixed_multiple.message,
          'Failed',
        ];

        // set status
        payload.rule.fixed_multiple.status = [
          ...payload.rule.fixed_multiple.status,
          false,
        ];

        // logging when params not eligible
        const logMessage: LoggingResult = {
          step: 'FIXED MULTIPLE - DEDUCT PROCESS TO CORE :: CATCH',
          data: {
            message: error?.message,
            stack: error?.stack,
          },
          message: 'fixed multiple - deduct process fail',
        };

        this.notification_deduct(logMessage, payload);

        const response: ResponseDeduct = {
          status: false,
          statusCode: 'E00000',
          message: 'Failed',
          data: {
            wallet: {
              __v: corePayload.__v,
            },
          },
        };

        // trigger recursive function
        await this.fixed_multiple_deduct_process(
          payload,
          response,
          point_loop + 1,
        );
        return error;
      }
    } else {
      // process recursive completed & show information about that
      console.log(
        `<--- fixed_multiple_deduct_process :: completed :: ${transaction_id} :: on loop #${point_loop} :: start --->`,
      );
      console.log('expected looping :', expected_point);
      console.log('history : ', payload.rule.fixed_multiple);
      console.log(
        `<--- fixed_multiple_deduct_process :: completed :: ${transaction_id} :: on loop #${point_loop} :: end --->`,
      );
      return;
    }
  }

  async save_to_local_collection(
    payload: DeductPointDocument,
    payload_kafka: any,
  ) {
    const response: ResponseDeduct = {
      status: false,
      message: 'Failed',
      statusCode: 'E00000',
      data: null,
    };

    const newData = new this.deductPointModel(payload);
    return await newData
      .save()
      .catch((e: BadRequestException) => {
        response.message = e.message;
        // Set Logging Failed
        this.logger_deduct({
          payload: payload_kafka,
          step: `Step :: Insert to collection`,
          message: e?.message,
          stack: e?.stack,
          is_success: false,
        });
        return response;
      })
      .then((data) => {
        response.statusCode = HttpStatusTransaction.CODE_SUCCESS;
        response.status = true;
        response.message = 'Success';
        response.data = data;

        // Set Logging Success
        this.logger_deduct({
          payload: payload_kafka,
          step: `Step :: Insert to collection`,
          message: 'Success insert to collection',
        });

        return response;
      });
  }

  // New Service for Deduct Proprity
  async deduct_validation(payload: any) {
    try {
      const startTime = new Date();

      const keyword = payload.keyword;
      const eligibility = payload.keyword.eligibility;
      const origin = payload.origin.split('.');

      // poin_changed is created under conditions whether using points from poin_redeemed in keyword.eligibility or poin from flash sale
      let poin_changed = eligibility.poin_redeemed;

      // If flashsale is true
      if (payload?.is_flashsale) {
        poin_changed = eligibility?.flashsale?.poin;
      }

      // set poin_changed to main payload
      payload.poin_changed = poin_changed;

      try {
        // add new field create_local_time
        payload.payload.deduct.create_local_time =
          this.transactionConfig.convertUTCtoGMT7LocalFormat(
            payload.submit_time ?? '',
          );
      } catch (error) {
        console.error('[DEDUCT] Failed create_local_time ', error?.message);
      }

      // Check point balance
      const check_point_balance = await this.checking_point_balance(payload);
      if (check_point_balance[0]) {
        const payload = check_point_balance[2];

        if (
          origin[origin.length - 1] == 'deduct_fail' ||
          origin[0] == 'deduct'
        ) {
          await this.deduct_prepare(payload);
          return false;
        } else {
          const bonus_external = keyword.bonus.filter(
            (e) =>
              e.bonus_type == 'telco_prepaid' ||
              e.bonus_type == 'telco_postpaid' ||
              e.bonus_type == 'ngrs' ||
              e.bonus_type == 'linkaja' ||
              e.bonus_type == 'linkaja_main' ||
              e.bonus_type == 'linkaja_bonus',
          );
          if (
            eligibility.poin_value === 'Fixed Multiple' &&
            bonus_external.length > 0
          ) {
            this.notification_deduct(
              'Fail because fixed multiple and bonus external is exists ',
              payload,
            );
          } else {
            if (
              eligibility.poin_value === 'Fixed' ||
              eligibility.poin_value === 'Fixed Multiple'
            ) {
              payload.payload.deduct.amount = poin_changed;
              this.deduct_prepare(payload);
            } else if (eligibility.poin_value === 'Flexible') {
              if (payload.payload.deduct.amount == -1) {
                payload.payload.deduct.amount = poin_changed;
              }
              this.deduct_prepare(payload);
            }

            /** Take out : 2024-07-01 **/
            // else if (eligibility.poin_value === 'Fixed Multiple') {
            //   // If more than 10 points are given a limit and set to 10
            //   if (payload?.incoming?.hasOwnProperty('total_redeem')) {
            //     const checkTotalPoint = payload?.incoming?.total_redeem;
            //     let limit_fixed_multiple = 10;

            //     try {
            //       const limit_fixed_multiple_config =
            //         await this.appliactionService.getConfig(
            //           'DEFAULT_CONS_LIMIT_FIXED_MULTIPLE_DEDUCT_POINT',
            //         );

            //       limit_fixed_multiple =
            //         limit_fixed_multiple_config ?? limit_fixed_multiple;
            //     } catch (error) {
            //       this.logger_deduct({
            //         payload: payload,
            //         step: 'Step :: Get config limit fixed multiple',
            //         message: `[FAILED] get config limit fixed multiple from systemconfig`,
            //         stack: {
            //           message: `[FAILED] cannot get limit fixed multiple from systemconfig`,
            //           data: payload?.incoming,
            //         },
            //         is_success: false,
            //       });
            //     }

            //     if (
            //       limit_fixed_multiple != 0 &&
            //       checkTotalPoint > limit_fixed_multiple
            //     ) {
            //       if (
            //         limit_fixed_multiple != 0 &&
            //         checkTotalPoint > limit_fixed_multiple
            //       ) {
            //         this.logger_deduct({
            //           payload: payload,
            //           step: 'Step :: Process limitation Fixed Multiple',
            //           message: `[FIXED-MULTIPLE] Total redeem more than ${limit_fixed_multiple}`,
            //           stack: {
            //             message: `Total redeem request : ${checkTotalPoint} --> Set to be ${limit_fixed_multiple}`,
            //             data: payload?.incoming,
            //           },
            //           is_success: false,
            //         });

            //         payload.incoming.total_redeem = limit_fixed_multiple;
            //       }
            //     }

            //     await this.fixed_multiple_deduct_process(payload);
            //   } else {
            //     this.notification_deduct(
            //       'Fail, point value is unknown ',
            //       payload,
            //     );
            //   }
            // }
            /** Take out : 2024-07-01 **/
          }
        }
      }

      const endTime = new Date();
      console.log(
        `NFT_KafkaController.deduct_validation = ${
          endTime.getTime() - startTime.getTime()
        } ms`,
      );
      return;
    } catch (error) {
      console.log('<--- issue :: prepare deduct -->');
      console.log(error.stack);
      const logMessage: LoggingResult = {
        step: 'PREPARE PAYLOAD DEDUCT',
        data: {
          message: error?.message,
          stack: error?.stack,
        },
        message: 'prepare deduct payload fail',
      };
      this.notification_deduct(logMessage, payload);
      console.log('<--- issue :: prepare deduct -->');
      return;
    }
  }

  async deduct_prepare(payload: any) {
    /** Take out : 2024-07-01 **/
    // if (payload.keyword.eligibility.poin_value === 'Fixed Multiple') {
    //   console.log('=== FIXED MULTIPLE ===');
    //   console.log(
    //     'Deduct counter masuk = ',
    //     payload.rule.fixed_multiple.counter,
    //   );
    //   console.log('=== FIXED MULTIPLE ===');
    // }
    /** Take out : 2024-07-01 **/

    const origin = payload.origin.split('.');
    const eligibility = payload.keyword.eligibility;
    console.log('=== DEDUCT PROCCESS ==');
    return await this.point_deduct(payload)
      .then((e) => {
        // set logging result
        const logMessage: LoggingResult = {
          step: 'PROCCESS DEDUCT TO CORE',
          data: e,
          message: '-',
        };

        if (e.code == 'S00000') {
          console.log('Success : ', e.code);
          if (origin[0] == 'deduct') {
            logMessage.message = e?.message;
            logMessage.data = e?.payload;
            logMessage.statusCode = 200;
            this.notification_deduct(logMessage, payload, false);
            return false;
          } else {
            const poinBalance =
              payload?.incoming?.responseBody?.payload?.wallet?.pocket?.reward
                ?.total ?? 0;
            const deductPoin = payload?.payload?.deduct?.amount ?? 0;
            const trx_date = moment(payload.submit_time).format('YYYY-MM-DD');
            const trx_datetime = moment(payload).format(
              'YYYY-MM-DD HH:mm:ss.SSS',
            );

            // emit to point event to BI
            this.clientReportingBI.emit('reporting-point-event-to-bi', {
              origin: 'reporting.deduct',
              tracing_id: payload.tracing_id,
              tracing_master_id: payload.tracing_master_id,
              payload: {
                trx_date: trx_date,
                msisdn: getMsisdnOnly(payload.incoming.msisdn),
                trx_datetime: trx_datetime,
                poin: deductPoin,
                pointype:
                  payload.payload.reporting_point_event_bi.point_type ?? '',
                reedem_channel: payload.payload.deduct.channel ?? '',
                merchant_name:
                  payload.payload.reporting_point_event_bi.merchant_name ?? '',
                customer_tier:
                  payload.customer.loyalty_tier &&
                  payload.customer.loyalty_tier.length > 0
                    ? payload.customer.loyalty_tier[0].name
                    : '',
                poin_balance: poinBalance + deductPoin,
                trx_id: payload.tracing_master_id,
              },
            });

            // send to outbound or inbound
            this.integration_deduct(payload, e);
          }
          return false;
        } else {
          if (e.code == 'E02001') {
            // send notification
            logMessage.message = 'Deduct fail';
            this.notification_deduct(logMessage, payload);
            return false;
          } else {
            // retry emit to consumer deduct until limit config
            logMessage.message = 'Deduct Fail & Retry Deduct';
            logMessage.statusCode = e.message == 'Forbidden' ? 403 : 400;
            this.retry_deduct(logMessage, payload);
            return false;
          }
        }
      })
      .catch((e) => {
        console.log('gagal ', e);
        // retry emit to consumer deduct until limit config
        this.retry_deduct(e.message, payload);
        return false;
      });
  }

  async refundProcess(payload: any, msg: string) {
    const logMessage: LoggingResult = {
      step: 'INTEGRATION DEDUCT',
      message: 'Bonus not found',
    };

    // if bonus not found on keyword
    const deduct = payload.payload.deduct;

    const refund_payload = payload;
    const refund: any = await this.merchantService
      .getMerchantSelf(refund_payload.token)
      .then((e) => {
        const pin = e.payload.merchant_config.authorize_code.refund;
        return {
          locale: deduct.locale,
          transaction_no: '',
          type: deduct.type,
          reason: msg,
          channel: deduct.channel,
          reward_item_id: deduct?.reward_item_id,
          reward_instance_id: deduct?.reward_instance_id,
          remark: deduct.remark,
          authorize_pin: pin,
          member_id: '',
          realm_id: deduct.realm_id,
          branch_id: deduct.branch_id,
          merchant_id: deduct.merchant_id,
          __v: 0,
        };
      })
      .catch((e) => {
        logMessage.message = 'Failed getMerchantSelf';
        logMessage.data = e?.stack;
      });
    const deductSuccess = payload?.payload?.tsel_id?.deduct_success;
    await Promise.all(
      deductSuccess.map((val) => {
        refund.transaction_no = val.transaction_no;
        refund.member_id = val.member_id;
      }),
    );
    refund_payload.payload.refund = refund;

    refund_payload.incoming.ref_transaction_id = refund.transaction_no;
    delete refund_payload.incoming.total_redeem;
    delete refund_payload.incoming.redeem_type;
    delete refund_payload.incoming.adn;
    delete refund_payload.incoming.send_notification;

    logMessage.data = refund_payload.incoming;

    // send to consumer refund
    this.clientRefund.emit('refund', refund_payload);
  }
  async compare(arr1, arr2) {
    return arr1.map((item, index) =>
      item?.msisdn === arr2[index]?.msisdn ? true : item,
    );
  }
}
