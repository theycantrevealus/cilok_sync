import {
  DeductPoint,
  DeductPointDocument,
} from '@deduct/models/deduct.point.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { EsbInboxService } from '@/esb/services/esb.inbox.service';
import { EsbNotificationService } from '@/esb/services/esb.notification.service';
import { MailService } from '@/mail/service/mail.service';
import { NotificationTemplate } from '@/notification/models/notification.model';

import { NOTIFICATION_TYPE } from '../consts/notification.const';
import { NotificationLog } from '../models/notification.log.model';
import { NotificationContentDto } from '../models/notification-content.dto';
import { NotificationNonTransactionDto } from '../models/notification-non-transaction.dto';
import { NotificationLogService } from './notification.log.service';
import { SendNotificationService } from './send-notification.service';

@Injectable()
export class SendNotificationGeneralService extends SendNotificationService {
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
    super(
      smsGatewayService,
      esbNotificationService,
      esbInboxService,
      mailService,
      notifContentService,
      callApiConfigService,
      notificationLogService,
      notificationLogModel,
      notificationTemplateModel,
    );
  }

  async send_notification_general(payload: NotificationNonTransactionDto) {
    const start = new Date();

    const notification: NotificationContentDto[] = payload?.notification
      ? payload?.notification
      : [];

    await this.notificationLogService.loggerNotificationVerbose(
      payload,
      notification,
      `[${payload?.tracing_id}] Sending general notification ...`,
      start,
    );

    if (notification.length > 0) {
      for (const notif of notification) {
        const via = notif.via;
        await this.notificationLogService.loggerNotificationVerbose(
          payload,
          {},
          `[${payload?.tracing_id}] Sending general via: ${via}`,
          start,
        );

        if (NOTIFICATION_TYPE.includes(via)) {
          const content = notif.template_content;
          switch (via) {
            case 'SMS':
              await this.send_notification_sms(
                {
                  keyword: payload['keyword'],
                  tracing_id: payload['tracing_id'],
                  via,
                  content,
                  msisdn: notif.param.msisdn,
                },
                notif.param,
              );
              break;

            case 'Email':
              await this.send_notification_email(
                {
                  tracing_id: payload['tracing_id'],
                  keyword: payload['keyword'],
                  msisdn: notif.param.msisdn,
                  via: via,
                  content,
                  email_address: notif.param.to,
                },
                notif.param,
              );
              break;

            case 'MyTelkomsel-Push Notification':
              await this.send_notification_esb_notification(
                {
                  keyword: payload['keyword'],
                  msisdn: notif.param.msisdn,
                  via: via,
                },
                notif.param,
              );
              break;

            case 'MyTelkomsel-Inbox':
              await this.send_notification_esb_inbox(
                {
                  keyword: payload['keyword'],
                  msisdn: notif.param.msisdn,
                  via: via,
                },
                notif.param,
              );
              break;

            default:
              break;
          }
        }
      }
    }
  }
}
