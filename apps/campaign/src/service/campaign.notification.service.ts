import { CallApiConfig } from '@configs/call-api.config';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import { CampaignNotificationLog } from '@/campaign/models/campaign.notification.log.model';
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

import { CAMPAIGN_TYPE, CAMPAIGN_VIA } from '../consts/campaign.type';
import { CampaignMessageDto } from '../models/campaign-message.dto';
import { CampaignNotificationLogDTO } from '../models/campaign-notification-log';

@Injectable()
export class CampaignNotificationService {
  protected smsGatewayService: SmsIntegrationService;
  protected esbNotificationService: EsbNotificationService;
  protected esbInboxService: EsbInboxService;
  protected callApiConfigService: CallApiConfigService;

  constructor(
    smsGatewayService: SmsIntegrationService,
    esbNotificationService: EsbNotificationService,
    esbInboxService: EsbInboxService,
    callApiConfigService: CallApiConfigService,

    @InjectModel(CampaignNotificationLog.name)
    protected notificationLog: Model<CampaignNotificationLog>,
  ) {
    this.smsGatewayService = smsGatewayService;
    this.esbNotificationService = esbNotificationService;
    this.esbInboxService = esbInboxService;
    this.callApiConfigService = callApiConfigService;
  }

  async send_campaign_factory(payload: CampaignMessageDto): Promise<boolean> {
    let isCampaignStatusSend = false;
    let partial = 0;
    for (const via of payload.notification_config.via) {
      if (CAMPAIGN_TYPE.includes(via.value)) {
        switch (via.value) {
          case CAMPAIGN_VIA.SMS:
            try {
              isCampaignStatusSend = await this.send_sms(payload);
              partial = partial + 1;
            } catch (error) {
              console.error(`CAMPAIGN SMS STAGE : ${error}`);
            }
            break;
          case CAMPAIGN_VIA.TLPUSHNOTIF:
            try {
              isCampaignStatusSend =
                await this.send_notification_esb_notification(payload);
              partial = partial + 1;
            } catch (error) {
              console.error(`CAMPAIGN MyTelkomsel PUSH NOTIF STAGE : ${error}`);
            }
            break;
          case CAMPAIGN_VIA.TLINBOX:
            try {
              isCampaignStatusSend = await this.send_notification_esb_inbox(
                payload,
              );
              partial = partial + 1;
            } catch (error) {
              console.error(`CAMPAIGN MyTelkomsel INBOX STAGE : ${error}`);
            }
            break;
          default:
            break;
        }
      }
    }

    if (partial > 0) {
      return isCampaignStatusSend;
    } else {
      return false;
    }
  }

  async send_sms(payload: CampaignMessageDto): Promise<boolean> {
    let is_send = false;
    const configAdn = await this.callApiConfigService.callConfig('ADN');
    const body = {
      from: configAdn ? configAdn : '777',
      to: formatMsisdnToID(payload.msisdn),
      text: payload.notification_config.content,
    };

    let response;

    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_SMS,
      );
      if (isEnabled) {
        is_send = true;
        response = await this.smsGatewayService.getV3(body);
        if (is_send) {
          response = `${response.status} - ${response.statusText} | ${response.data}`;
        }
      }
    } catch (error) {
      response = error.message;
    }

    await this.campaign_notification_log({
      campaign_recipient_id: new ObjectId(payload.campaign_recipient_id),
      is_send: is_send,
      request: body,
      response,
      via: CAMPAIGN_VIA.SMS,
    });

    return is_send;
  }

  async send_notification_esb_inbox(
    payload: CampaignMessageDto,
  ): Promise<boolean> {
    let is_send = false;

    const body = new EsbInboxDto();

    const bodyTransaction = new InboxTransactionDto();
    bodyTransaction.channel = 'i1';
    body.transaction = bodyTransaction;

    const bodyService = new InboxServiceDto();
    bodyService.service_id = payload.msisdn;
    body.service = bodyService;

    const bodyInbox = new InboxDto();
    bodyInbox.content = payload.notification_config.content;
    bodyInbox.service = 'DigitalNotification';
    bodyInbox.version = 'v2';
    bodyInbox.language = 'id';
    bodyInbox.title = 'NEW CAMPAIGN';
    bodyInbox.content = payload.notification_config.content;

    body.inbox = bodyInbox;

    let response;
    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_INBOX_ESB,
      );
      if (isEnabled) {
        response = await this.esbInboxService.post(body);
      }
      is_send = true;
    } catch (error) {
      response = error;
    }

    // Record notification Log
    await this.campaign_notification_log({
      campaign_recipient_id: new ObjectId(payload.campaign_recipient_id),
      is_send: is_send,
      request: body,
      response,
      via: CAMPAIGN_VIA.TLINBOX,
    });

    return is_send;
  }

  async send_notification_esb_notification(
    payload: CampaignMessageDto,
  ): Promise<boolean> {
    let is_send = false;

    const body = new EsbNotificationDTO();

    const bodyTransaction = new NotificationTransactionDto();
    bodyTransaction.channel = 'i1';
    body.transaction = bodyTransaction;

    const bodyService = new NotificationServiceDto();
    bodyService.service_id = payload.msisdn;
    body.service = bodyService;

    const bodyInbox = new NotificationInboxDto();
    bodyInbox.content = payload.notification_config.content;
    bodyInbox.service = 'DigitalNotification';
    bodyInbox.language = 'id';
    bodyInbox.title = 'NEW CAMPAIGN';
    body.inbox = bodyInbox;

    let response;
    try {
      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_PUSH_NOTIF_ESB,
      );

      if (isEnabled) {
        response = await this.esbNotificationService.post(body);
      }
      is_send = true;
    } catch (error) {
      response = error;
    }

    // Record notification Log
    await this.campaign_notification_log({
      campaign_recipient_id: new ObjectId(payload.campaign_recipient_id),
      is_send: is_send,
      request: body,
      response,
      via: CAMPAIGN_VIA.TLPUSHNOTIF,
    });

    return is_send;
  }

  async campaign_notification_log(payload: CampaignNotificationLogDTO) {
    try {
      const notif = new this.notificationLog(payload);
      notif.save().catch((err) => {
        throw err;
      });
    } catch (error) {
      console.log(`[x] CREATE LOG CAMPAIGN NOTIF ${payload.via} : ${error}`);
    }
  }
}
