import { SmsIntegrationService } from "@/application/integrations/sms.integration";
import { EsbInboxService } from "@/esb/services/esb.inbox.service";
import { EsbNotificationService } from "@/esb/services/esb.notification.service";
import { KeywordNotification } from "@/keyword/models/keyword.notification.model";
import { KeywordService } from "@/keyword/services/keyword.service";
import { Lov } from "@/lov/models/lov.model";
import { LovService } from "@/lov/services/lov.service";
import { MailService } from "@/mail/service/mail.service";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { NotificationLog } from "../models/notification.log.model";

@Injectable()
export class SendNotificationService {
  private keywordService: KeywordService;
  private smsGatewayService: SmsIntegrationService;
  private esbNotificationService: EsbNotificationService;
  private esbInboxService: EsbInboxService;
  private lovService: LovService;
  private mailService: MailService

  constructor(
    keywordService: KeywordService,
    smsGatewayService: SmsIntegrationService,
    esbNotificationService: EsbNotificationService,
    esbInboxService: EsbInboxService,
    lovService: LovService,
    mailService: MailService,

    @InjectModel(NotificationLog.name) private notificationLogModel: Model<NotificationLog>,
  ) {
    this.keywordService = keywordService,
      this.smsGatewayService = smsGatewayService,
      this.esbNotificationService = esbNotificationService,
      this.esbInboxService = esbInboxService,
      this.lovService = lovService,
      this.mailService = mailService
  }

  async send_notification(keyword: string, msisdn: string, param: any) {
    const { notification } = await this.keywordService.getKeywordByName(keyword);
    for (const notif of notification) {
      for (const via of notif.via) {
        const lov = await this.get_via_form_lov(via);
        switch (lov.set_value) {
          case 'SMS':
            await this.send_notification_sms({
              keyword,
              via,
              notif,
              msisdn,
            },
              param);
            break;
          case 'Email':
            await this.send_notification_email(
              {
                keyword: keyword,
                msisdn,
                via: via,
                notif: notif
              },
              param);
            break;
          case 'MyTelkomsel-Push Notification':
            await this.send_notification_esb_notification(
              {
                keyword: keyword,
                msisdn,
                via: via
              }, param);
            break;
          case 'MyTelkomsel-Inbox':
            await this.send_notification_esb_inbox(
              {
                keyword: keyword,
                msisdn,
                via: via,
              }, param);
            break;
          default:
            break;
        }
      }
    }
  }

  async send_notification_sms(
    payload: {
      keyword: string
      msisdn: string,
      via: string,
      notif: KeywordNotification,
    },
    param) {
    let is_send = false;
    let response;

    console.log('<--- payload :: notification sms -->')
    console.log(payload);
    console.log('<--- payload :: notification sms -->')

    try {
      response = await this.smsGatewayService.get({
        from: (param?.from) ? param.from : 'Test',
        to: payload.msisdn,
        text: payload.notif.notification_content
      })
      console.log('<--- success :: notification sms response -->')
      console.log(response);
      console.log('<--- success :: notification sms response -->')

      is_send = true;
    } catch (error) {
      response = error
      console.log('<--- error :: notification sms response -->')
      console.log(response);
      console.log('<--- error :: notification sms response -->')
    }

    // Record notification Log
    await this.record_notification_log({
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send
    });
  }

  async send_notification_esb_inbox(
    payload: {
      keyword: string,
      msisdn: string,
      via: string
    },
    param) {

    let is_send = false;
    let response;
    try {
      response = await this.esbInboxService.post(param);
      is_send = true;
    } catch (error) {
      response = error;
    }

    // Record notification Log
    await this.record_notification_log({
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send
    });
  }

  async send_notification_esb_notification(
    payload: {
      keyword: string,
      msisdn: string,
      via: string
    },
    param
  ) {
    let is_send = false;
    let response;
    try {
      response = await this.esbNotificationService.post(param);
      is_send = true;
    } catch (error) {
      response = error;
    }

    // Record notification Log
    await this.record_notification_log({
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send
    });
  }

  async send_notification_email(
    payload: {
      keyword: string,
      msisdn: string
      via: string,
      notif: KeywordNotification
    }, param) {

    param.data.data = payload.notif.notification_content;

    let is_send = false;
    let response;
    try {
      response = await this.mailService.sendMailConfirmation(param?.email, param?.data)
      is_send = true;
    } catch (error) {
      response = error;
    }

    // Record notification Log
    await this.record_notification_log({
      keyword: payload.keyword,
      msisdn: payload.msisdn,
      via: payload.via,
      request: param,
      response,
      is_send
    });
  }

  /**
   * Record Data Notification Log
   * @param payload 
   */
  async record_notification_log(payload: {
    keyword: string,
    msisdn: string,
    via: string,
    request,
    response,
    is_send: boolean
  }): Promise<void> {
    new this.notificationLogModel({
      ...payload
    }).save();
  }

  /**
   * get data lov from get type notification
   * @param id 
   * @returns Lov
   */
  async get_via_form_lov(id: string): Promise<Lov> {
    return await this.lovService.getLovData(id);
  }
}
