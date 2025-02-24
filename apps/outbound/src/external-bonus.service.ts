import { CallApiConfig } from '@configs/call-api.config';
import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { MerchantService } from '@deduct/services/merchant.service';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { allowedIndihomeNumber } from '@utils/logger/formatters';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import {
  ExternalBonusEnum,
  ExternalBonusLog,
} from '@/application/models/external-bonus.model';
// import {
//   SystemConfig,
//   SystemConfigDocument,
// } from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';
import {
  CallbackPostpaid,
  CallbackPostpaidDocument,
} from '@/transaction/models/callback/postpaid.callback.model';
import {
  CallbackPrepaid,
  CallbackPrepaidDocument,
} from '@/transaction/models/callback/prepaid.callback.model';

import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { IAccount, LoggingData } from '../../utils/logger/transport';
import { EsbNgrsService } from './esb/services/esb.ngrs.service';
import { EsbOrderService } from './esb/services/esb.order.service';
import { AdjustCustomerPointService } from './linkaja/services/adjust.customer.point.service';
import { AssignVoucherService } from './linkaja/services/assign.voucher.service';
import { MainBalanceService } from './linkaja/services/main.balance.service';

@Injectable()
export class ExternalBonusService {
  private linkaja_service: AdjustCustomerPointService;
  private linkaja_service_main: MainBalanceService;
  private link_aja_service_voucher: AssignVoucherService;
  private telco_product_service: EsbOrderService;
  private ngrs_service: EsbNgrsService;
  private callApiConfigService: CallApiConfigService;
  private esbUrlCallback: string;

  constructor(
    telco_product_service: EsbOrderService,
    linkaja_service: AdjustCustomerPointService,
    linkaja_service_main: MainBalanceService,
    link_aja_service_voucher: AssignVoucherService,
    ngrs_service: EsbNgrsService,
    private appliactionService: ApplicationService,
    private notifService: NotificationContentService,
    @Inject('INBOUND_SERVICE_PRODUCER')
    private readonly clientInboundKafka: ClientKafka,
    @Inject('OUTBOUND_SERVICE_PRODUCER')
    private readonly clientOutbound: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,
    @InjectModel(ExternalBonusLog.name)
    private externalBonusLogModel: Model<ExternalBonusLog>,
    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,
    private merchantService: MerchantService,
    callApiConfigService: CallApiConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @InjectModel(CallbackPrepaid.name)
    private prepaidCallbackModel: Model<CallbackPrepaidDocument>,
    @InjectModel(CallbackPostpaid.name)
    private postpaidCallbackModel: Model<CallbackPostpaidDocument>,
  ) {
    this.telco_product_service = telco_product_service;
    this.linkaja_service = linkaja_service;
    this.link_aja_service_voucher = link_aja_service_voucher;
    this.ngrs_service = ngrs_service;
    this.linkaja_service_main = linkaja_service_main;
    this.callApiConfigService = callApiConfigService;
    this.esbUrlCallback = this.esbUrlCallback = `${configService.get<string>(
      'esb-backend.api.url',
    )}/loyalty/redeem/callback`;
  }

  /**
   * for generate random string example testing
   */

  async generateRandomString() {
    let uuid = '';
    const chars = 'abcdef0123456789';
    const segments = [8, 4, 4, 4, 12];

    for (let i = 0; i < segments.length; i++) {
      for (let j = 0; j < segments[i]; j++) {
        uuid += chars[Math.floor(Math.random() * chars.length)];
      }

      if (i < segments.length - 1) {
        uuid += '-';
      }
    }

    return uuid;
  }

  /**
   *
   * @param payload object of message
   * @param outbound object of payload outbound
   */

  async process_external_bonus(payload, outbound, loggerObject) {
    const startTime = new Date();
    let EXTERNAL_BONUS_SUCCESS = false;
    let handleDisable = false;

    if (outbound.telco_postpaid || outbound.telco_prepaid) {
      const bonus_type = outbound.telco_postpaid
        ? ExternalBonusEnum.TELCO_POSTPAID
        : ExternalBonusEnum.TELCO_PREPAID;
      const payload_submit_order_esc =
        outbound.telco_postpaid || outbound.telco_prepaid;
      const api_name = outbound.telco_postpaid
        ? CallApiConfig.API_POSTPAID
        : CallApiConfig.API_PREPAID;

      try {
        let res = null;
        const isEnabled = await this.callApiConfigService.callApiIsEnabled(
          api_name,
        );
        if (isEnabled) {
          res = await this.telco_product_service.post(payload_submit_order_esc);
        } else {
          handleDisable = true;
          res = `${api_name} is Disabled`;
        }

        if (res) {
          if (
            res?.payload?.transaction?.status_code === '00000' ||
            !isEnabled
          ) {
            EXTERNAL_BONUS_SUCCESS = true;
          }

          // add response esb to payload
          if (res?.payload?.transaction?.status_desc) {
            payload.outbound_error_description =
              res?.payload?.transaction?.status_desc;
          } else {
            payload.outbound_error_description = res?.payload;
          }
        } else {
          EXTERNAL_BONUS_SUCCESS = true;
        }

        if (handleDisable) {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/order/submit',
            payload_submit_order_esc,
            res,
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/order/submit',
            payload_submit_order_esc,
            res,
            false,
            error,
          );
        }

        await this.save_to_log(
          payload,
          payload_submit_order_esc,
          res,
          bonus_type,
          !isEnabled ? false : true,
          null,
          startTime,
          loggerObject,
        );

        await this.notification_outbound(
          null,
          payload,
          !EXTERNAL_BONUS_SUCCESS,
          api_name,
          res,
        );
      } catch (error) {
        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/order/submit',
            payload_submit_order_esc,
            null,
            false,
            error,
          );
        } catch (error) {
          console.log('log error before retry', error);
        }
        await this.retry_outbound(
          payload,
          'TELCO',
          payload_submit_order_esc,
          error,
          bonus_type,
          startTime,
          loggerObject,
          api_name,
        );
      }
    }

    if (outbound.ngrs) {
      const bonus_type = ExternalBonusEnum.NGRS;
      const payloadNgrs = outbound.ngrs;

      try {
        let res = null;

        const isEnabled = await this.callApiConfigService.callApiIsEnabled(
          CallApiConfig.API_NGRS,
        );
        if (isEnabled) {
          res = await this.ngrs_service.post(payloadNgrs);
        } else {
          handleDisable = true;
          res = `${CallApiConfig.API_NGRS} is Disabled`;
        }

        if (res) {
          if (
            res?.payload?.transaction?.status_code === '00000' ||
            !isEnabled
          ) {
            EXTERNAL_BONUS_SUCCESS = true;
          }
        } else {
          EXTERNAL_BONUS_SUCCESS = true;
        }

        if (handleDisable) {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/modern/recharge/dealer',
            payloadNgrs,
            res,
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/modern/recharge/dealer',
            payloadNgrs,
            res,
            false,
            error,
          );
        }

        await this.save_to_log(
          payload,
          payloadNgrs,
          res,
          bonus_type,
          !isEnabled ? false : true,
          null,
          startTime,
          loggerObject,
        );

        await this.notification_outbound(
          null,
          payload,
          !EXTERNAL_BONUS_SUCCESS,
          CallApiConfig.API_NGRS,
          res,
        );
      } catch (error) {
        console.log('======================= NGRS ERROR');
        console.log(error);
        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/modern/recharge/dealer',
            payloadNgrs,
            null,
            false,
            error,
          );
        } catch (error) {
          console.log('log error before retry', error);
        }
        await this.retry_outbound(
          payload,
          'NGRS',
          payloadNgrs,
          error,
          bonus_type,
          startTime,
          loggerObject,
          CallApiConfig.API_NGRS,
        );
      }
    }

    if (outbound.link_aja_bonus) {
      const bonus_type = ExternalBonusEnum.LINK_AJA_BONUS;
      const payloadLinkAjaBonus = outbound.link_aja_bonus;

      try {
        let res = null;
        const isEnabled = await this.callApiConfigService.callApiIsEnabled(
          CallApiConfig.API_LINKAJA_BONUS,
        );
        if (isEnabled) {
          res = await this.linkaja_service.adjustCustomerPointBalance(
            payloadLinkAjaBonus,
          );
        } else {
          handleDisable = true;
          res = `${CallApiConfig.API_LINKAJA_BONUS} is Disabled`;
        }

        EXTERNAL_BONUS_SUCCESS = true;

        if (res.status === '00') {
          EXTERNAL_BONUS_SUCCESS = true;
        } else {
          EXTERNAL_BONUS_SUCCESS = false;
        }
        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/poin/v1/submit',
            payloadLinkAjaBonus,
            JSON.stringify(res),
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
        }

        await this.save_to_log(
          payload,
          payloadLinkAjaBonus,
          res.payload ? JSON.stringify(res.payload) : JSON.stringify(res),
          bonus_type,
          !isEnabled ? false : EXTERNAL_BONUS_SUCCESS ? true : false,
          null,
          startTime,
          loggerObject,
        );

        if (handleDisable) {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        if (res.status === '00') {
          EXTERNAL_BONUS_SUCCESS = true;
        } else {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/poin/v1/submit',
            payloadLinkAjaBonus,
            res,
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/poin/v1/submit',
            payloadLinkAjaBonus,
            res,
            false,
            error,
          );
        }
        console.log('res link aja bonus : ', res);

        await this.notification_outbound(
          null,
          payload,
          !EXTERNAL_BONUS_SUCCESS,
          CallApiConfig.API_LINKAJA_BONUS,
        );
      } catch (error) {
        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/poin/v1/submit',
            payloadLinkAjaBonus,
            JSON.stringify(error),
            false,
            error,
          );
        } catch (error) {
          console.log('error log oubound request', error);
        }

        await this.retry_outbound(
          payload,
          'LINKAJA',
          payloadLinkAjaBonus,
          error,
          bonus_type,
          startTime,
          loggerObject,
          CallApiConfig.API_LINKAJA_BONUS,
        );
      }
    }

    if (outbound.link_aja_main) {
      const bonus_type = ExternalBonusEnum.LINK_AJA_MAIN;
      const payloadLinkAja = outbound.link_aja_main;

      try {
        let response = null;
        const isEnabled = true;
        // const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        //   CallApiConfig.API_LINKAJA_MAIN,
        // );
        if (isEnabled) {
          response = await this.linkaja_service_main.disbursement(
            payloadLinkAja,
          );
        } else {
          response = `${CallApiConfig.API_LINKAJA_MAIN} is Disabled`;
        }

        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/disbursement/check',
            payloadLinkAja,
            JSON.stringify(response),
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
        }

        EXTERNAL_BONUS_SUCCESS = true;
        await this.save_to_log(
          payload,
          payloadLinkAja,
          response,
          bonus_type,
          !isEnabled ? false : true,
          null,
          startTime,
          loggerObject,
        );

        await this.notification_outbound(
          null,
          payload,
          false,
          CallApiConfig.API_LINKAJA_MAIN,
        );
      } catch (error) {
        this.loggerRequestToOutbound(
          startTime,
          payload,
          '/disbursement/check',
          payloadLinkAja,
          JSON.stringify(error),
          EXTERNAL_BONUS_SUCCESS,
        );
        await this.retry_outbound(
          payload,
          'LINKAJA',
          payloadLinkAja,
          error,
          bonus_type,
          startTime,
          loggerObject,
          CallApiConfig.API_LINKAJA_MAIN,
        );
      }
    }

    if (outbound.link_aja_voucher) {
      console.log(this.generateRandomString(), 'this.generateRandomString()');
      const bonus_type = ExternalBonusEnum.LINK_AJA_VOUCHER;
      const payloadLinkAjaVoucher = {
        msisdn: outbound.link_aja_voucher.msisdn,
        transactionId: await this.generateRandomString(),
        partnerVoucherId: outbound.link_aja_voucher.partner_voucher_id
          ? outbound.link_aja_voucher.partner_voucher_id
          : '038f4385-3562-4285-9e24-292028049912',
        expiryDate: outbound.link_aja_voucher.expiryDate
          ? outbound.link_aja_voucher.expiryDate
          : '',
      };

      outbound.link_aja_voucher = payloadLinkAjaVoucher;
      payload.payload.link_aja_voucher = payloadLinkAjaVoucher;
      try {
        let response = null;
        const isEnabled = await this.callApiConfigService.callApiIsEnabled(
          CallApiConfig.API_LINKAJA_VOUCHER,
        );
        if (isEnabled) {
          response = await this.link_aja_service_voucher.assignVoucher(
            payloadLinkAjaVoucher,
          );
        } else {
          handleDisable = true;
          response = `${CallApiConfig.API_LINKAJA_VOUCHER} is Disabled`;
        }

        EXTERNAL_BONUS_SUCCESS = true;

        console.log(response, 'response.loggg');
        console.log('res link aja voucher : ', response);

        if (handleDisable) {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        if (response.status === '00') {
          EXTERNAL_BONUS_SUCCESS = true;
        } else {
          EXTERNAL_BONUS_SUCCESS = false;
        }

        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/v1/vouchers/assign',
            payloadLinkAjaVoucher,
            response,
            EXTERNAL_BONUS_SUCCESS,
          );
        } catch (error) {
          console.log('error log oubound request', error);
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/v1/vouchers/assign',
            payloadLinkAjaVoucher,
            response,
            false,
            error,
          );
        }

        await this.save_to_log(
          payload,
          payloadLinkAjaVoucher,
          JSON.stringify(response),
          bonus_type,
          !isEnabled ? false : EXTERNAL_BONUS_SUCCESS ? true : false,
          null,
          startTime,
          loggerObject,
        );

        console.log(response, 'response.loggg');

        await this.notification_outbound(
          null,
          payload,
          !EXTERNAL_BONUS_SUCCESS,
          CallApiConfig.API_LINKAJA_VOUCHER,
        );
      } catch (error) {
        console.log('error catch linkaja voucher : ', error);
        try {
          this.loggerRequestToOutbound(
            startTime,
            payload,
            '/v1/vouchers/assign',
            payloadLinkAjaVoucher,
            JSON.stringify(error),
            false,
            error,
          );
        } catch (error) {
          console.log('error log oubound request', error);
        }

        await this.retry_outbound(
          payload,
          'LINKAJA',
          payloadLinkAjaVoucher,
          error,
          bonus_type,
          startTime,
          loggerObject,
          CallApiConfig.API_LINKAJA_VOUCHER,
        );
      }
    }

    // if (EXTERNAL_BONUS_SUCCESS) {
    //   await this.emit_to_inbound(payload);
    // }

    return true;
  }

  async emit_to_inbound(payload) {
    const outbound = [
      'link_aja_bonus',
      'link_aja_main',
      'link_aja_voucher',
      'ngrs',
      'telco_postpaid',
      'telco_prepaid',
    ];
    for (const bonus of payload.keyword.bonus) {
      if (!outbound.includes(bonus.bonus_type)) {
        payload.origin = payload.origin + '.' + 'outbound_success';
        this.clientInboundKafka.emit('inbound', payload);
      }
    }
  }

  async retry_outbound(
    payload: any,
    externalBonus: string,
    payloadExternalBonus: any,
    error?: any,
    bonus_type?: string,
    startTime?: any,
    loggerObject?: any,
    typeBonus?: any,
  ) {
    // get config default from config
    let point_stopper = await this.appliactionService.getConfig(
      `DEFAULT_CONS_RETRY_${externalBonus}`,
    );

    if (!point_stopper) {
      point_stopper = 2;
    }

    console.log('agung enable 1');

    const ORIGIN_NAME = await this.origin_build(externalBonus);
    const origin_fail = payload.origin + '.' + ORIGIN_NAME + '_fail';
    payload.origin = origin_fail;

    console.log('agung enable 2');
    console.log(
      'agung benar tidak ? ',
      payload.retry.outbound.counter >= point_stopper,
    );
    console.log('agung benar tidak ?  1 ', payload.retry.outbound.counter);
    console.log('agung benar tidak ?  2 ', point_stopper);

    // if counter outbound is more than stopper counter from config
    if (payload.retry.outbound.counter >= point_stopper) {
      console.log('test logg');

      console.log('agung enable 3');
      await this.save_to_log(
        payload,
        payloadExternalBonus,
        error,
        bonus_type,
        false,
        error.message,
        startTime,
        loggerObject,
      );
      // send notification cause counter is more than limit
      await this.notification_outbound(
        'Stopped retrying, the counter is exceeds the limit',
        payload,
        true,
        typeBonus,
      );
    } else {
      console.log('looping agung');
      // send to consumer outbound if condition config counter outbound is not fulfilled
      payload.retry.outbound.counter += 1; //default counter = 0, counter = counter + 1;
      payload.retry.outbound.errors = [
        ...payload.retry.outbound.errors,
        error.message,
      ]; // Joining error messege
      this.clientOutbound.emit('outbound', payload);
    }
  }

  async origin_build(externalBonus: string): Promise<string> {
    switch (externalBonus) {
      case 'LINKAJA':
        return 'linkaja';
      case 'NGRS':
        return 'ngrs';
      case 'TELCO':
        return 'telco';
      default:
        break;
    }
  }

  async notification_outbound(
    message: any,
    payload: any,
    fail = true,
    typeBonus,
    response = null,
  ) {
    if (fail) {
      // payload set origin success
      const origin = payload.origin + '.' + 'outbound_fail';
      payload.origin = origin;
      payload.error_message = message;
      console.log('origin outbound fail agung : ', payload.origin);

      let notifGroup = NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER;

      if (typeBonus == CallApiConfig.API_LINKAJA_BONUS) {
        notifGroup = NotificationTemplateConfig.OUTBOUND_FAILED_LINK_AJA_BONUS;
      } else if (typeBonus == CallApiConfig.API_LINKAJA_VOUCHER) {
        notifGroup =
          NotificationTemplateConfig.OUTBOUND_FAILED_LINK_AJA_VOUCHER;
      } else if (typeBonus == CallApiConfig.API_LINKAJA_MAIN) {
        notifGroup = NotificationTemplateConfig.OUTBOUND_FAILED_LINK_AJA_MAIN;
      } else if (typeBonus == CallApiConfig.API_POSTPAID) {
        notifGroup = NotificationTemplateConfig.OUTBOUND_FAILED_TELCO_POSTPAID;
      } else if (typeBonus == CallApiConfig.API_PREPAID) {
        notifGroup = NotificationTemplateConfig.OUTBOUND_FAILED_TELCO_PREPAID;
      } else if (typeBonus == CallApiConfig.API_NGRS) {
        notifGroup = NotificationTemplateConfig.OUTBOUND_FAILED_NGRS;
      }

      console.log('typeBonus agung : ', typeBonus);
      console.log('notifGroup agung : ', notifGroup);

      payload.outbound = response;
      payload.notification = await this.notifService.getNotificationTemplate(
        notifGroup,
        payload,
      );

      // Section for set refund
      return await this.handleRefundPoint(payload, message);
    } else {
      // payload set origin success
      const origin = payload.origin + '.' + 'outbound_success';
      payload.origin = origin;
      console.log('origin outbound success agung : ', payload.origin);

      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
        payload,
      );

      if (
        payload.bonus_type == 'telco_prepaid' ||
        payload.bonus_type == 'telco_postpaid'
      ) {
        let notifFail = [];
        if (payload.bonus_type == 'telco_prepaid') {
          notifFail = await this.notifService.getNotificationTemplate(
            NotificationTemplateConfig.OUTBOUND_FAILED_TELCO_PREPAID,
            payload,
          );
        } else {
          notifFail = await this.notifService.getNotificationTemplate(
            NotificationTemplateConfig.OUTBOUND_FAILED_TELCO_POSTPAID,
            payload,
          );
        }

        this.save_to_callback(payload, notifFail[0]);
      }

      return this.notificationClient.emit('notification', payload);
    }
  }

  async save_to_log(
    payload,
    request,
    response,
    bonus_type,
    is_success,
    error,
    start,
    loggerObject,
  ) {
    let parent_transaction_id = payload.tracing_master_id;
    if (payload?.incoming?.additional_param) {
      const parse_additional_param = payload.incoming.additional_param;

      if (parse_additional_param?.parent_transaction_id) {
        parent_transaction_id = parse_additional_param.parent_transaction_id;
      }
    }

    const data = {
      trace_id: payload.tracing_id,
      master_id: payload.tracing_master_id,
      parent_master_id: parent_transaction_id,
      keyword: payload.incoming.keyword,
      msisdn: payload.incoming.msisdn,
      bonus_type: bonus_type,
      is_success,
      request,
      response,
      error,
    };
    // await this.loggerOutbound(
    //   payload,
    //   { bonus_type: bonus_type, is_success, request, response, error },
    //   `Outbound Log Data ${bonus_type} ${is_success ? 'Success' : 'Failed'}`,
    //   start,
    //   is_success,
    //   loggerObject,
    // );
    const log = new this.externalBonusLogModel(data);
    log.save();
  }

  async loggerOutbound(
    payload: any,
    dataCheck: any,
    message: any,
    start: any,
    is_success: any,
    loggerObject: any,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    await this.exceptionHandler.handle({
      level: is_success ? 'error' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: is_success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: is_success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        method: 'kafka',
        url: 'outbound',
        service: 'OUTBOUND',
        step: message,
        param: loggerObject,
        taken_time: takenTime,
        result: {
          user_id: new IAccount(payload.account),
          statusCode: is_success ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: is_success ? 'error' : 'verbose',
          message: dataCheck.response,
          trace: payload.tracing_id,
          msisdn: payload.incoming.msisdn,
          ...dataCheck,
        },
        // service: ExternalBonusService.name,
        // user_id: payload.account,
        // step: message,
        // param: loggerObject,
        // result: {
        //   statusCode: is_success ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        //   message: message,
        //   trace: payload.tracing_id,
        //   msisdn: payload.incoming.msisdn,
        //   ...dataCheck,
        // },
      } satisfies LoggingData,
    });
  }

  private async handleRefundPoint(payload: any, refund_reason: string) {
    console.log(payload, 'payload agung refund outbound');
    let getMerchant = null;
    const refund = await this.merchantService
      .getMerchantSelf(payload.token)
      .then((res) => {
        console.log(res, 'res agung refund outbound');
        const pin = res?.payload?.merchant_config?.authorize_code?.refund;
        getMerchant = true;
        return {
          locale: payload?.payload?.deduct?.locale,
          transaction_no: payload?.payload?.deduct?.transaction_no,
          type: payload?.payload?.deduct?.type,
          // Reason TBC
          reason: refund_reason ? refund_reason : '',
          remark: `Refund ${payload?.keyword?.eligibility?.program_title_expose}`,
          authorize_pin: pin,
          member_id: payload?.payload?.deduct?.member_id,
          realm_id: payload?.payload?.deduct?.realm_id,
          branch_id: payload?.payload?.deduct?.branch_id,
          merchant_id: payload?.payload?.deduct?.merchant_id,
          __v: 0,
        };
      })
      .catch((e) => {
        console.log('error get merchant outbound', e);
        getMerchant = false;
      });

    if (getMerchant) {
      payload.payload.refund = refund;
      payload.incoming.ref_transaction_id =
        payload?.payload?.deduct?.transaction_no;

      // send to consumer refund
      this.refundClient.emit('refund', payload);
    }
  }

  async save_to_callback(payload, notifFail) {
    try {
      // Prepare data
      let targetUrl = '';
      let type = '';
      if (payload?.incoming?.callback_url) {
        const url = payload.incoming.callback_url.split('?');
        const urlParam = new URLSearchParams(url[1]);
        type = urlParam.get('type');
        targetUrl = url[0];
      } else {
        targetUrl = this.esbUrlCallback;
      }

      const contentUnParsed = payload.notification
        ? payload?.notification[0]?.template_content
        : '';
      const contentParsed =
        await this.notifService.generateNotificationTemplateFromConsumer(
          contentUnParsed,
          payload,
        );

      const contentFailParsed =
        await this.notifService.generateNotificationTemplateFromConsumer(
          notifFail?.template_content,
          payload,
        );

      const notifFailCode = notifFail?.notification_code;

      const merchant = payload?.keyword?.eligibility?.merchant
        ? await this.merchantModel.findById(
            payload?.keyword?.eligibility?.merchant,
          )
        : null;

      const data = {
        trx_id: payload?.incoming?.transaction_id
          ? payload?.incoming?.transaction_id
          : payload?.tracing_master_id,
        msisdn: payload?.incoming?.msisdn,
        channel: payload?.incoming?.channel_id,
        keyword: payload?.incoming?.keyword,
        status: 'success',
        notif: contentParsed,
        notif_fail: contentFailParsed,
        notif_code_fail: notifFailCode,
        target_url: targetUrl,
        type: type,
        submit_time: payload?.submit_time,
        notif_code: payload.notification
          ? payload?.notification[0]?.notification_code
          : '',
        merchant: merchant?.merchant_name,
        total_poin: payload?.payload?.deduct?.amount,
        bonus_type: payload?.bonus_type,
      };

      if (payload.bonus_type == 'telco_prepaid') {
        let prepaidCallback = await this.prepaidCallbackModel.findOne({
          transaction_id: payload?.tracing_master_id,
        });

        if (prepaidCallback) {
          // update
          prepaidCallback.payload = data;
          prepaidCallback.created_by = payload?.account?._id; // account,
        } else {
          // create
          prepaidCallback = new this.prepaidCallbackModel({
            transaction_id: payload?.tracing_master_id,
            payload: data,
            created_by: payload?.account?._id, // account,
          });
        }

        return await prepaidCallback
          .save()
          .catch((e: Error) => {
            console.log(
              `failed save to prapaid callback ${payload?.tracing_master_id}`,
            );
            throw new Error(e.message);
          })
          .then(async (result) => {
            console.log(
              `success save to prapaid callback ${payload?.tracing_master_id}`,
              result,
            );
          });
      } else {
        let postpaidCallback = await this.postpaidCallbackModel.findOne({
          trxid: payload?.tracing_master_id,
        });

        if (postpaidCallback) {
          // update
          postpaidCallback.payload = data;
          postpaidCallback.msisdn = payload?.incoming?.msisdn;
        } else {
          // create
          postpaidCallback = new this.postpaidCallbackModel({
            trxid: payload?.tracing_master_id,
            msisdn: payload?.incoming?.msisdn,
            payload: data,
          });
        }

        return await postpaidCallback
          .save()
          .catch((e: Error) => {
            console.log(
              `failed save to postpaid callback ${payload?.tracing_master_id}`,
            );
            throw new Error(e.message);
          })
          .then(async (result) => {
            console.log(
              `success save to postpaid callback ${payload?.tracing_master_id}`,
              result,
            );
          });
      }
    } catch (error) {
      console.log(error);
    }
  }

  async loggerRequestToOutbound(
    start,
    payloadKafka,
    urlOutbound,
    request,
    response,
    isSuccess,
    info = null,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    console.log('request taken time : ', takenTime);
    this.exceptionHandler.handle({
      level: 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payloadKafka?.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: isSuccess ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      payload: {
        transaction_id: payloadKafka?.tracing_id,
        statusCode: isSuccess ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        method: 'kafka',
        url: urlOutbound,
        service: 'OUTBOUND',
        step: payloadKafka?.bonus_type,
        taken_time: takenTime,
        param: {
          ...payloadKafka,
          endpoint: urlOutbound,
        },
        result: {
          statusCode: isSuccess ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
          level: 'verbose',
          message: `Request : ${JSON.stringify(
            request,
          )}, Response : ${JSON.stringify(response)}, Info : ${info}`,
          trace: payloadKafka?.tracing_id,
          msisdn: payloadKafka?.incoming.msisdn,
          user_id: new IAccount(payloadKafka?.account),
        },
      } satisfies LoggingData,
    });
  }
}
