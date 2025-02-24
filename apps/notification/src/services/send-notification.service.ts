import { CallApiConfig } from '@configs/call-api.config';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  checkCustomerIdentifier,
  formatMsisdnToID,
} from '@/application/utils/Msisdn/formatter';
import { EsbInboxDto } from '@/esb/dtos/esb.inbox.dto';
import { EsbNotificationDTO } from '@/esb/dtos/esb.notification.dto';
import { InboxDto } from '@/esb/dtos/inbox.dto';
import { InboxServiceDto } from '@/esb/dtos/inbox.service.dto';
import { InboxTransactionDto } from '@/esb/dtos/inbox.transaction.dto';
import { NotificationInboxDto } from '@/esb/dtos/notification.inbox.dto';
import { NotificationServiceDto } from '@/esb/dtos/notification.service.dto';
import { NotificationTransactionDto } from '@/esb/dtos/notification.transaction.dto';
import { EsbInboxService } from '@/esb/services/esb.inbox.service';
import { EsbNotificationService } from '@/esb/services/esb.notification.service';
import { MailService } from '@/mail/service/mail.service';
import { MyTselResponseStatusCodeEnum } from '@/mytsel/constant/mytsel.response.status.code.enum';
import {
  MyTselInboxDetailDto,
  MyTselInboxDto,
} from '@/mytsel/dtos/mytsel.inbox.dto';
import {
  MyTselPushNotifDetailDto,
  MyTselPushNotifDto,
} from '@/mytsel/dtos/mytsel.pushnotif.dto';
import { MyTselResponseInboxPushNotif } from '@/mytsel/dtos/mytsel.response.inbox.pushnotif';
import { MyTselInboxService } from '@/mytsel/services/mytsel.inbox.service';
import { MyTselPushNotifService } from '@/mytsel/services/mytsel.pushnotif.service';
import { NotificationTemplate } from '@/notification/models/notification.model';

import { TimeManagement } from '../../../gateway/src/modules/application/utils/Time/timezone';
import { EsbResponseStatusCodeEnum } from '../../../gateway/src/modules/esb/constans/esb.response.status.code.enum';
import { EsbServiceType } from '../../../gateway/src/modules/esb/constans/esb.servicetype.enum';
import {
  EsbRedeemLoyaltyCallbackBodyDto,
  EsbRedeemLoyaltyCallbackDto,
  EsbRedeemLoyaltyCallbackInfoDto,
  EsbRedeemLoyaltyCallbackServiceDto,
} from '../../../gateway/src/modules/esb/dtos/esb.redeem.loyalty.callback.dto';
import { EsbRedeemLoyaltyCallbackResponseDto } from '../../../gateway/src/modules/esb/dtos/esb.redeem.loyalty.callback.response.dto';
import { EsbRedeemLoyaltyService } from '../../../gateway/src/modules/esb/services/esb.redeem.loyalty.service';
import { FmcIdenfitiferType } from '../../../gateway/src/modules/transaction/dtos/point/fmc.member.identifier.type';
import { NOTIFICATION_TYPE } from '../consts/notification.const';
import { NotificationLog } from '../models/notification.log.model';
import {
  NotificationContentDto,
  NotificationContentV2Dto,
  NotificationParamEmail,
} from '../models/notification-content.dto';
import { NotificationLogService } from './notification.log.service';

@Injectable()
export class SendNotificationService {
  protected smsGatewayService: SmsIntegrationService;
  protected esbNotificationService: EsbNotificationService;
  protected esbInboxService: EsbInboxService;
  protected myTselInboxService: MyTselInboxService;
  protected myTselPushNotifService: MyTselPushNotifService;
  protected esbRedeemLoyaltyService: EsbRedeemLoyaltyService;
  protected mailService: MailService;
  protected notifContentService: NotificationContentService;
  protected callApiConfigService: CallApiConfigService;
  protected notificationLogService: NotificationLogService;

  constructor(
    smsGatewayService: SmsIntegrationService,
    esbNotificationService: EsbNotificationService,
    esbInboxService: EsbInboxService,
    myTselInboxService: MyTselInboxService,
    myTselPushNotifService: MyTselPushNotifService,
    esbRedeemLoyaltyService: EsbRedeemLoyaltyService,
    mailService: MailService,
    notifContentService: NotificationContentService,
    callApiConfigService: CallApiConfigService,
    notificationLogService: NotificationLogService,

    @InjectModel(NotificationLog.name)
    protected notificationLogModel: Model<NotificationLog>,
    @InjectModel(NotificationTemplate.name)
    protected notificationTemplateModel: Model<NotificationTemplate>,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly clientNotification: ClientKafka,
  ) {
    (this.callApiConfigService = callApiConfigService),
      (this.smsGatewayService = smsGatewayService),
      (this.esbNotificationService = esbNotificationService),
      (this.esbInboxService = esbInboxService),
      (this.mailService = mailService),
      (this.notifContentService = notifContentService),
      (this.notificationLogService = notificationLogService),
      (this.myTselInboxService = myTselInboxService),
      (this.myTselPushNotifService = myTselPushNotifService),
      (this.esbRedeemLoyaltyService = esbRedeemLoyaltyService);
  }

  async send_notification(
    keyword: string,
    msisdn: string,
    param: any,
    payload,
  ) {
    const start = new Date();
    // console.log('Sending notification...');

    const notification: NotificationContentV2Dto[] = payload?.notification
      ? payload?.notification
      : [];

    // console.log(notification);
    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      notification,
      `Sending notification ...`,
      start,
    );

    // TODO, need check identifier type to define msisdn/indihome number/tsel_id
    const checkIdentifier = checkCustomerIdentifier(msisdn);

    let integrationTimeoutCounter = 0;
    let countNotif = 0;
    const retryNotifications: NotificationContentV2Dto[] = [];
    if (notification.length > 0) {
      for (const notif of notification) {
        const via = notif.via;

        console.log(`Sending via ${via}`);
        await this.notificationLogService.loggerNotificationVerbose(
          payload,
          {},
          `Sending via: ${via}`,
          start,
        );

        if (NOTIFICATION_TYPE.includes(via)) {
          const content = await this.parsing_content(
            notif.template_content,
            payload,
          );
          switch (via) {
            case 'SMS':
              if (
                this.is_msisdn(checkIdentifier.isValid, checkIdentifier.type)
              ) {
                await this.send_notification_sms(
                  {
                    keyword: payload['incoming']['keyword'],
                    tracing_id: payload['tracing_id'],
                    via,
                    content,
                    msisdn,
                  },
                  param,
                );
              } else {
                // console.log('No notification found');
                await this.notificationLogService.loggerNotificationVerbose(
                  payload,
                  {},
                  `Notif via is SMS, but msisdn is invalid`,
                  start,
                );
              }

              break;

            case 'Email':
              const emails = payload.customer?.email
                ? payload.customer.email
                : payload.customer.core_email
                ? payload.customer.core_email
                : null;

              const params = new NotificationParamEmail();
              params.to = emails;
              params.text = content;
              params['email'] = param.email ? param.email : null;

              await this.send_notification_email(
                {
                  tracing_id: payload['tracing_id'],
                  keyword: payload['incoming']['keyword'],
                  msisdn,
                  via: via,
                  content,
                  email_address: emails,
                },
                params,
              );
              break;

            // using ESB
            case 'MyTelkomsel-Push Notification':
              if (
                !this.is_msisdn(checkIdentifier.isValid, checkIdentifier.type)
              ) {
                break;
              }

              const bodyNtf = new EsbNotificationDTO();
              const bodyTransactionNtf = new NotificationTransactionDto();
              bodyTransactionNtf.channel = 'i1';
              bodyNtf.transaction = bodyTransactionNtf;

              const bodyServiceNtf = new NotificationServiceDto();
              bodyServiceNtf.service_id = payload['incoming']['msisdn'];
              bodyNtf.service = bodyServiceNtf;

              const bodyInboxNtf = new NotificationInboxDto();
              bodyInboxNtf.content = content;
              bodyInboxNtf.language = 'id';
              bodyNtf.inbox = bodyInboxNtf;

              await this.send_notification_esb_notification(
                {
                  keyword: payload['incoming']['keyword'],
                  msisdn,
                  via: via,
                },
                bodyNtf,
              );
              break;

            // using ESB
            case 'MyTelkomsel-Inbox':
              if (
                !this.is_msisdn(checkIdentifier.isValid, checkIdentifier.type)
              ) {
                break;
              }

              const body = new EsbInboxDto();
              const bodyTransaction = new InboxTransactionDto();
              bodyTransaction.channel = 'i1';
              body.transaction = bodyTransaction;

              const bodyService = new InboxServiceDto();
              bodyService.service_id = payload['incoming']['msisdn'];
              body.service = bodyService;

              const bodyInbox = new InboxDto();
              bodyInbox.content = content;
              bodyInbox.service = 'DigitalNotification';
              bodyInbox.version = 'v2';
              bodyInbox.language = 'id';
              body.inbox = bodyInbox;

              await this.send_notification_esb_inbox(
                {
                  keyword: payload['incoming']['keyword'],
                  msisdn,
                  via: via,
                },
                body,
              );
              break;

            // using ESB
            case 'MyTsel-Notification-Callback':
              const origin = payload.origin;
              console.log('payload.origin', payload.origin);
              const origin_split = origin.split('.');
              const last_origin = origin_split.pop().split('_');
              const status = last_origin[last_origin.length - 1];
              console.log('status', status);

              // for retry needs
              const needRetry = notif.is_retry ?? true;
              const retryCount = notif.retry_count ?? 0;

              const callbackParams = new EsbRedeemLoyaltyCallbackDto();
              callbackParams.channel = payload['incoming']['channel_id'] ?? 'SMS';
              callbackParams.transaction_id =
                payload['incoming']['transaction_id'] ?? '';

              const callbackBodyService =
                new EsbRedeemLoyaltyCallbackServiceDto();

              let custNumber = checkIdentifier.custNumber;
              if (checkIdentifier.type == FmcIdenfitiferType.MSISDN) {
                custNumber = formatMsisdnToID(custNumber);
              }
              callbackBodyService.service_id = custNumber;
              callbackBodyService.service_type =
                checkIdentifier.type.toString() ==
                EsbServiceType.MSISDN.toString()
                  ? EsbServiceType.MSISDN
                  : EsbServiceType.IH;

              const callbackBodyInfo = new EsbRedeemLoyaltyCallbackInfoDto();
              callbackBodyInfo.status = status == 'success' ? '1' : '0';
              callbackBodyInfo.username = 'test';
              callbackBodyInfo.password = 'test';
              callbackBodyInfo.partner_callback_url =
                'http://hoverfly-fmc:8500/redeem-callback-hoverfly';

              // callbackBodyInfo.username = 'undefined';
              // callbackBodyInfo.password = 'undefined';
              callbackBodyInfo.keyword = payload['incoming']['keyword'];
              callbackBodyInfo.notif = content;

              const submitTime =
                payload?.submit_time ?? new Date().toISOString();

              callbackBodyInfo.timestamp = Math.floor(
                new Date(submitTime).getTime() / 1000,
              ).toString();

              callbackBodyInfo.err_code = status == 'success' ? '000' : '010';
              callbackBodyInfo.msg_code = notif.notification_code ?? '';
              callbackBodyInfo.err_msg = status;

              const callbackBody = new EsbRedeemLoyaltyCallbackBodyDto();
              callbackBody.service = callbackBodyService;
              callbackBody.callback_info = callbackBodyInfo;

              callbackParams.body = callbackBody;

              const esbResult =
                await this.send_notif_esb_redeem_loyalty_callback(
                  {
                    keyword: payload['incoming']['keyword'],
                    msisdn,
                    via: via,
                  },
                  callbackParams,
                  needRetry,
                  retryCount,
                  payload['incoming']['callback_url'] ?? '',
                );

              // check if need retry
              if (
                esbResult.status == EsbResponseStatusCodeEnum.REQUEST_TIMEOUT
              ) {
                const retryNotif = { ...notification[countNotif] };
                retryNotif.is_retry = true;
                retryNotif.retry_count = retryCount + 1;
                retryNotifications.push(retryNotif);
                integrationTimeoutCounter++;
              }
              break;

            // direct to mytsel
            case 'MyTsel-Inbox':
              if (
                this.is_not_msisdn(
                  checkIdentifier.isValid,
                  checkIdentifier.type,
                )
              ) {
                // for retry needs
                const needRetry = notif.is_retry ?? true;
                const retryCount = notif.retry_count ?? 0;

                // send inbox
                const body = new MyTselInboxDto();
                body.channel = 'i1';
                body.state = 'transaction_info';
                body.transaction_id = payload?.tracing_id ?? '';

                const inboxContent = new MyTselInboxDetailDto();
                inboxContent.language = 'id';
                inboxContent.title = 'Notifikasi Telkomsel Reward';
                inboxContent.content = content;
                inboxContent.service_id = checkIdentifier.custNumber;
                inboxContent.timestamp =
                  await new TimeManagement().getTimeRaw();

                const myTselResult = await this.send_notif_mytsel_inbox(
                  {
                    keyword: payload['incoming']['keyword'],
                    msisdn,
                    via: via,
                  },
                  body,
                  needRetry,
                  retryCount,
                );

                // check if need retry
                if (
                  myTselResult.status ==
                  MyTselResponseStatusCodeEnum.REQUEST_TIMEOUT
                ) {
                  const retryNotif = { ...notification[countNotif] };
                  retryNotif.is_retry = true;
                  retryNotif.retry_count = retryCount + 1;
                  retryNotifications.push(retryNotif);
                  integrationTimeoutCounter++;
                }
              }
              break;
            // direct to mytsel
            case 'MyTsel-Notification':
              if (
                this.is_not_msisdn(
                  checkIdentifier.isValid,
                  checkIdentifier.type,
                )
              ) {
                // for retry needs
                const needRetry = notif.is_retry ?? true;
                const retryCount = notif.retry_count ?? 0;

                // send notif
                const body = new MyTselPushNotifDto();
                body.channel = 'i1';
                body.state = 'transaction_info';
                body.transaction_id = payload?.tracing_id ?? '';

                const inboxContent = new MyTselPushNotifDetailDto();
                inboxContent.title = 'Notifikasi Telkomsel Reward';
                inboxContent.content = content;
                inboxContent.identifier = checkIdentifier.custNumber;

                const myTselResult = await this.send_notif_mytsel_notification(
                  {
                    keyword: payload['incoming']['keyword'],
                    msisdn,
                    via: via,
                  },
                  body,
                  needRetry,
                  retryCount,
                );

                // check if need retry
                if (
                  myTselResult.status ==
                  MyTselResponseStatusCodeEnum.REQUEST_TIMEOUT
                ) {
                  const retryNotif = { ...notification[countNotif] };
                  retryNotif.is_retry = true;
                  retryNotif.retry_count = retryCount + 1;
                  retryNotifications.push(retryNotif);
                  integrationTimeoutCounter++;
                }
              }
              break;

            default:
              console.log(`Via not identified : ${via}`);
              break;
          }
        }

        countNotif++;
      }

      /**
       * If integration notification service timeout error found,
       * so will emit to notification it self to retry send notification
       */
      if (integrationTimeoutCounter > 0) {
        payload.notification = retryNotifications;
        this.clientNotification.emit('notification', payload);
        await this.notificationLogService.loggerNotificationVerbose(
          payload,
          {},
          `[NOTIFICATION SERVICE] retry to send notification`,
          start,
        );
      }
    } else {
      // console.log('No notification found');
      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        {},
        `No notification found!`,
        start,
      );
    }

    // if (countNotif === 0) {
    //   switch (payload.origin) {
    //     case "redeem.eligibility_success.deduct_fail":
    //       const newData = new this.deductPointModel({
    //         msisdn: payload.customer.msisdn,
    //         keyword: payload.kayword._id,
    //         program_id: (payload.program) ? payload.program._id : null,
    //         send_notification: false,
    //         callback_url: "payload.origin",
    //         created_by: payload.account
    //       }).save();
    //       break;
    //     default:
    //       break};
    //   }
    // }
  }

  async send_notification_sms(
    payload: {
      keyword: string;
      tracing_id: string;
      msisdn: string;
      via: string;
      content: string;
    },
    param,
  ) {
    const start = new Date();

    let is_send = false;
    let response;

    const configAdn = await this.callApiConfigService.callConfig('ADN');
    const body = {
      from: configAdn ? configAdn : '777',
      to: payload.msisdn,
      text: payload.content,
    };

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[SMS] starting send SMS!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_SMS,
      );
      if (isEnabled) {
        is_send = true;
        response = await this.smsGatewayService.getV3(body);
        // TODO : Response content untuk SMS adalah full request http
        if (is_send) {
          response = `${response.status} - ${response.statusText} | ${response.data}`;
        }

        await this.notificationLogService.loggerNotificationVerbose(
          payload,
          response,
          `[SMS] send SMS success!`,
          start,
        );
      }
    } catch (error) {
      response = error;
      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[SMS] Error: ${error?.message}!`,
        error?.trace,
      );
    }

    try {
      // Record notification Log
      await this.record_notification_log({
        tracing_id: payload.tracing_id,
        keyword: payload.keyword,
        msisdn: payload.msisdn,
        via: payload.via,
        request: body,
        response,
        is_send,
      })
        .then(() => {
          console.log('Come here');
        })
        .catch(() => {
          console.log('Goes here');
        });
    } catch (error) {
      console.log('here???');
      console.log(error.message);
    }
  }

  async send_notification_esb_inbox(
    payload: {
      keyword: string;
      msisdn: string;
      via: string;
    },
    param,
  ) {
    const start = new Date();

    let is_send = false;
    let response;

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[ESB_INBOX] starting send ESB_INBOX!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_INBOX_ESB,
      );

      if (isEnabled) {
        response = await this.esbInboxService.post(param);
      }

      is_send = true;

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        `[ESB_INBOX] send ESB_INBOX success!`,
        start,
      );
    } catch (error) {
      response = error;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[ESB_INBOX] Error: ${error.message}`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: param.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send,
    });
  }

  async send_notification_esb_notification(
    payload: {
      keyword: string;
      msisdn: string;
      via: string;
    },
    param,
  ) {
    const start = new Date();

    let is_send = false;
    let response;

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[ESB_NOTIF] starting send ESB_NOTIF!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_NOTIF_ESB,
      );

      if (isEnabled) {
        response = await this.esbNotificationService.post(param);
      }

      is_send = true;

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        `[ESB_NOTIF] send ESB_NOTIF success!`,
        start,
      );
    } catch (error) {
      response = error;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[ESB_NOTIF] Error: ${error.message}!`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: param.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send,
    });
  }

  async send_notification_email(
    payload: {
      tracing_id: string;
      keyword: string;
      msisdn: string;
      via: string;
      content: string;
      email_address?: string;
    },
    param,
  ) {
    const start = new Date();

    let is_send = false;
    let response;

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[EMAIL] starting send EMAIL!`,
      start,
    );

    try {
      let email;

      if (param) {
        email = param.email
          ? param.email
          : payload.email_address
          ? payload.email_address
          : param.to;
      }

      if (email) {
        // await this.callApiConfigService.callApiIsEnabled(CallApiConfig.API_EMAIL);
        const isEnabled = await this.callApiConfigService.callApiIsEnabled(
          CallApiConfig.API_EMAIL,
        );

        param['email'] = email;
        if (isEnabled) {
          response = await this.mailService.sendMailConfirmation(email, param);
        }

        is_send = true;
      } else {
        response = 'Customer Email Not Define';
      }

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        `[EMAIL] send EMAIL success!`,
        start,
      );
    } catch (error) {
      response = error.message;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[EMAIL] Error: ${error.message}`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: payload?.tracing_id ? payload.tracing_id : payload.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send,
    });
  }

  async send_notif_mytsel_inbox(
    payload: {
      keyword: string;
      msisdn: string;
      via: string;
    },
    param,
    needRetry,
    retryCount,
  ): Promise<MyTselResponseInboxPushNotif> {
    const start = new Date();
    let isSend = false;
    let response = new MyTselResponseInboxPushNotif();

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[MYTSEL_INBOX] starting send MYTSEL_INBOX!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_INBOX_MYTSEL,
      );

      // get max retry configuration for myTsel API
      const maxRetry = await this.callApiConfigService.callConfig(
        'DEFAULT_CONS_RETRY_MYTSEL_INBOX_NOTIF',
      );
      const isRetry = this.is_retry(needRetry, retryCount, maxRetry);

      let logMessage = ``;
      if (isEnabled && isRetry) {
        response = await this.myTselInboxService.post(param);
        if (response.status === 200) {
          isSend = true;
          logMessage = `[MYTSEL_INBOX] send MYTSEL_INBOX success!`;
        } else {
          logMessage = `[MYTSEL_INBOX] send MYTSEL_INBOX fail!`;
        }
      } else {
        response.status = MyTselResponseStatusCodeEnum.BAD_REQUEST;
        response.message = 'Max retry has reached';
        response.payload = param;

        logMessage = `[MYTSEL_INBOX] ${response.message}!`;
      }

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        logMessage,
        start,
      );
    } catch (error) {
      response.message = error;
      response.status = 500;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[MYTSEL_INBOX] Error: ${error.message}`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: param.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send: isSend,
    });

    return response;
  }

  async send_notif_mytsel_notification(
    payload: {
      keyword: string;
      msisdn: string;
      via: string;
    },
    param,
    needRetry,
    retryCount,
  ) {
    const start = new Date();
    let isSend = false;
    let response = new MyTselResponseInboxPushNotif();

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[MYTSEL_NOTIF] starting send MYTSEL_NOTIF!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_NOTIF_MYTSEL,
      );

      // get max retry configuration for myTsel API
      const maxRetry = await this.callApiConfigService.callConfig(
        'DEFAULT_CONS_RETRY_MYTSEL_INBOX_NOTIF',
      );
      const isRetry = this.is_retry(needRetry, retryCount, maxRetry);

      let logMessage = ``;
      if (isEnabled && isRetry) {
        response = await this.myTselPushNotifService.post(param);
        if (response.status === 200) {
          isSend = true;
          logMessage = `[MYTSEL_NOTIF] send MYTSEL_NOTIF success!`;
        } else {
          logMessage = `[MYTSEL_NOTIF] send MYTSEL_NOTIF fail!`;
        }
      } else {
        response.status = MyTselResponseStatusCodeEnum.BAD_REQUEST;
        response.message = 'Max retry has reached';
        response.payload = param;

        logMessage = `[MYTSEL_NOTIF] ${response.message}!`;
      }

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        logMessage,
        start,
      );
    } catch (error) {
      response.message = error;
      response.status = 500;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[MYTSEL_NOTIF] Error: ${error.message}`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: param.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send: isSend,
    });

    return response;
  }

  async send_notif_esb_redeem_loyalty_callback(
    payload: {
      keyword: string;
      msisdn: string;
      via: string;
    },
    param,
    needRetry,
    retryCount,
    customURLESB,
  ) {
    const start = new Date();
    let isSend = false;
    let response = new EsbRedeemLoyaltyCallbackResponseDto();

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      {},
      `[ESB_REDEEM_LOYALTY_CALLBACK_NOTIF] starting send ESB_NOTIF!`,
      start,
    );

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_REDEEM_LOYALTY_CALLBACK_ESB,
      );

      // get max retry configuration for myTsel API
      const maxRetry = await this.callApiConfigService.callConfig(
        'DEFAULT_CONS_RETRY_ESB_REDEEM_LOYALTY_CALLBACK_NOTIF',
      );
      const isRetry = this.is_retry(needRetry, retryCount, maxRetry);

      let logMessage = ``;
      if (isEnabled && isRetry) {
        response = await this.esbRedeemLoyaltyService.callback(
          param,
          customURLESB,
        );
        if (response.status === 200) {
          isSend = true;
          logMessage = `[ESB_REDEEM_LOYALTY_CALLBACK_NOTIF] send ESB_NOTIF success!`;
        } else {
          logMessage = `[ESB_REDEEM_LOYALTY_CALLBACK_NOTIF] send ESB_NOTIF fail!`;
        }
      } else {
        response.status = EsbResponseStatusCodeEnum.BAD_REQUEST;
        response.message = 'Max retry has reached';
        response.payload = param;

        logMessage = `[ESB_REDEEM_LOYALTY_CALLBACK_NOTIF] ${response.message}!`;
      }

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        response,
        logMessage,
        start,
      );
    } catch (error) {
      response.message = error;
      response.status = 500;

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `[ESB_REDEEM_LOYALTY_CALLBACK_NOTIF] Error: ${error.message}`,
        error.trace,
      );
    }

    // Record notification Log
    await this.record_notification_log({
      tracing_id: param.tracing_id,
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send: isSend,
    });

    return response;
  }

  /**
   * Record Data Notification Log
   * @param payload
   */
  async record_notification_log(payload: {
    tracing_id: string;
    keyword: string;
    msisdn: string;
    via: string;
    request;
    response;
    is_send: boolean;
  }): Promise<void> {
    try {
      const notif = new this.notificationLogModel({
        tracing_id: payload.tracing_id,
        keyword: payload.keyword,
        msisdn:
          payload.msisdn && payload.msisdn !== ''
            ? formatMsisdnToID(payload.msisdn)
            : payload.msisdn,
        via: payload.via,
        request: payload.request,
        response: payload.response,
        is_send: payload.is_send,
      });

      notif.save().catch(() => {
        console.log('Or Here?');
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   *  this service not use
   * @returns
   */
  async get_notification_template() {
    const template = await this.notificationTemplateModel
      .findOne({ notif_name: 'CUST_ERROR_NOTIFICATION' })
      .lean();
    return template;
  }

  async parsing_content(content: string, payload): Promise<string> {
    const generate_content =
      this.notifContentService.generateNotificationTemplateFromConsumer(
        content,
        payload,
      );
    return generate_content;
  }

  is_not_msisdn(isValid: boolean, type: FmcIdenfitiferType): boolean {
    if (isValid && type != FmcIdenfitiferType.MSISDN) {
      return true;
    }
    return false;
  }

  is_msisdn(isValid: boolean, type: FmcIdenfitiferType): boolean {
    if (isValid && type == FmcIdenfitiferType.MSISDN) {
      return true;
    }
    return false;
  }

  /**
   * Need to parse max retry cause it get from db, possible string
   */
  is_retry(needRetry: boolean, retryCount: number, maxRetry: any) {
    if (needRetry && retryCount < parseInt(maxRetry)) {
      return true;
    }
    return false;
  }
}
