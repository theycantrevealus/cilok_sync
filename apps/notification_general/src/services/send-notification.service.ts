import { CallApiConfig } from '@configs/call-api.config';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
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
import { NotificationTemplate } from '@/notification/models/notification.model';
import {
  DeductPoint,
  DeductPointDocument,
} from '@/transaction/models/point/deduct.point.model';

import { NOTIFICATION_TYPE } from '../consts/notification.const';
import { NotificationLog } from '../models/notification.log.model';
import {
  NotificationContentDto,
  NotificationParamEmail,
} from '../models/notification-content.dto';
import { NotificationLogService } from './notification.log.service';

@Injectable()
export class SendNotificationService {
  protected smsGatewayService: SmsIntegrationService;
  protected esbNotificationService: EsbNotificationService;
  protected esbInboxService: EsbInboxService;
  protected mailService: MailService;
  protected notifContentService: NotificationContentService;
  protected callApiConfigService: CallApiConfigService;
  protected notificationLogService: NotificationLogService;

  constructor(
    smsGatewayService: SmsIntegrationService,
    esbNotificationService: EsbNotificationService,
    esbInboxService: EsbInboxService,
    mailService: MailService,
    notifContentService: NotificationContentService,
    callApiConfigService: CallApiConfigService,
    notificationLogService: NotificationLogService,

    @InjectModel(NotificationLog.name)
    protected notificationLogModel: Model<NotificationLog>,
    @InjectModel(NotificationTemplate.name)
    protected notificationTemplateModel: Model<NotificationTemplate>,
  ) {
    (this.callApiConfigService = callApiConfigService),
      (this.smsGatewayService = smsGatewayService),
      (this.esbNotificationService = esbNotificationService),
      (this.esbInboxService = esbInboxService),
      (this.mailService = mailService),
      (this.notifContentService = notifContentService),
      (this.notificationLogService = notificationLogService);
  }

  async send_notification(
    keyword: string,
    msisdn: string,
    param: any,
    payload,
  ) {
    const start = new Date();
    // console.log('Sending notification...');

    const notification: NotificationContentDto[] = payload?.notification
      ? payload?.notification
      : [];

    // console.log(notification);
    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      notification,
      `Sending notification ...`,
      start,
    );

    const countNotif = 0;
    if (notification.length > 0) {
      for (const notif of notification) {
        const via = notif.via;

        // console.log(`Sending via ${via}`);
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

            case 'MyTelkomsel-Push Notification':
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

            case 'MyTelkomsel-Inbox':
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

            default:
              console.log(`Via not identified : ${via}`);
              break;
          }
        }
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
}
