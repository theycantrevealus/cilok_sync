import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { Lov, LovDocument } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '@/notification/models/notification.model';

@Injectable()
export class ReportingNotificationService {
  constructor(
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(NotificationTemplate.name)
    private notificationTemplateModel: Model<NotificationTemplateDocument>,
  ) {}

  private async getTemplate(group_name: string) {
    const lov = await this.lovModel.findOne({ group_name });
    if (lov) {
      const template = await this.notificationTemplateModel.findOne({
        _id: new ObjectId(lov.set_value.toString()),
      });

      if (template) {
        const notif = [];
        for (const iterator of template['notif_via']) {
          const via = await this.lovModel.findOne({
            _id: new ObjectId(iterator.toString()),
          });

          notif.push({
            via: via.set_value,
            template_content: template.notif_content,
          });
        }

        return notif ? notif : null;
      } else {
        const newLov = new this.lovModel({
          group_name,
          set_value: null,
          additional: 'notificationtemplates',
        });

        newLov.save();
        return null;
      }
    }
  }

  private async replaceHtmlContent(html, param) {
    let result = html;
    const paramInHtml = html.match(/\[(.*?)\]/g);

    for (let i = 0; i < paramInHtml.length; i++) {
      const paramKey = paramInHtml[i];
      const paramKeyWithoutBracket = paramKey.replace('[', '').replace(']', '');

      result = result.replace(paramKey, param[paramKeyWithoutBracket]);
    }

    return result;
  }

  async sendNotificationDailySummaryPoint(parameter, period, html_payload) {
    const template_group = 'NOTIFICATION_GROUP_REPORTING_DAILY_SUMMARY_POINT';
    let notifications = (await this.getTemplate(template_group)) ?? [];

    const subject = parameter.notification.subject;
    const tos = parameter.notification.to;
    const ccs = parameter.notification.cc;

    console.log(
      parameter,
      period,
      html_payload,
      'log summary parameter, period, html_payload ',
    );

    // tambahkan param
    notifications = await Promise.all(
      notifications.map(async (el) => {
        const replace_html = await this.replaceHtmlContent(
          el.template_content,
          {
            htmlContent: html_payload,
          },
        );

        console.log(replace_html, 'log summary replace_html ');

        const param = {
          to: tos,
          cc: ccs,
          html: replace_html,
          subject: `${subject} NEW${String(period).replace(/-/g, '')}`,
        };

        console.log(param, 'log summary param ');

        el.template_content = replace_html;
        el.param = param;

        return el;
      }),
    );

    // payload utama notif
    const payload = {
      origin: 'reporting.daily_summary_point',
      tracing_id: '',
      tracing_master_id: '',
      notification: notifications,
    };

    // console.log(payload);
    console.log('-> Emit to notification_general ..');
    // console.log(payload);
    console.log(payload, 'log summary payload ');
    await this.notificationGeneralClient.emit(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC, payload);
  }

  async sendNotificationTrendsChannel(parameter, period, html_payload) {
    const template_group = 'NOTIFICATION_GROUP_REPORTING_TRENDS_CHANNEL';
    let notifications = (await this.getTemplate(template_group)) ?? [];

    const subject = parameter.subject;
    const tos = parameter.to;
    const ccs = parameter.cc;

    // tambahkan param
    notifications = await Promise.all(
      notifications.map(async (el) => {
        const replace_html = await this.replaceHtmlContent(
          el.template_content,
          {
            period: period,
            htmlContent: html_payload,
          },
        );

        console.log(replace_html, 'replace_html');

        const param = {
          to: tos,
          cc: ccs,
          html: replace_html,
          subject: `${subject} NEW${String(period).replace(/-/g, '')}`,
        };

        el.template_content = replace_html;
        el.param = param;

        return el;
      }),
    );

    // payload utama notif
    const payload = {
      origin: 'reporting.daily_trends_channel',
      tracing_id: '',
      tracing_master_id: '',
      notification: notifications,
    };

    // console.log(payload);
    console.log('-> Emit to notification ..');
    // console.log(payload);
    await this.notificationGeneralClient.emit(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC, payload);
  }

  async sendNotificationErrorRedeemerTrends(parameter, period, html_payload) {
    const template_group = 'NOTIFICATION_GROUP_REPORTING_ERROR_REDEEMER_TRENDS';
    let notifications = (await this.getTemplate(template_group)) ?? [];

    const subject = parameter.notification.subject;
    const tos = parameter.notification.to;
    const ccs = parameter.notification.cc;

    // tambahkan param
    notifications = await Promise.all(
      notifications.map(async (el) => {
        const replace_html = await this.replaceHtmlContent(
          el.template_content,
          {
            htmlContent: html_payload,
          },
        );

        const param = {
          to: tos,
          cc: ccs,
          html: replace_html,
          subject: `${subject} NEW${String(period).replace(/-/g, '')}`,
        };

        el.template_content = replace_html;
        el.param = param;

        return el;
      }),
    );

    // payload utama notif
    const payload = {
      origin: 'reporting.error_redeemer_trends',
      tracing_id: '',
      tracing_master_id: '',
      notification: notifications,
    };

    // console.log(payload);
    console.log('-> Emit to notification_general ..');
    // console.log(payload);
    await this.notificationGeneralClient.emit(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC, payload);
  }

  async sendNotificationKeywordWithStock(
    parameter,
    period,
    html_payload,
    other_payload,
  ) {
    const template_group = 'NOTIFICATION_GROUP_REPORTING_KEYWORD_WITH_STOCK';
    let notifications = (await this.getTemplate(template_group)) ?? [];

    const subject = parameter.notification.subject;
    const tos = parameter.notification.to;
    const ccs = parameter.notification.cc;

    // tambahkan param
    notifications = await Promise.all(
      notifications.map(async (el) => {
        const replace_html = await this.replaceHtmlContent(
          el.template_content,
          {
            program: other_payload.program,
            period: period,
            htmlContent: html_payload,
          },
        );

        const param = {
          to: tos,
          cc: ccs,
          html: replace_html,
          subject: `${subject} ${other_payload.program}`,
        };

        el.template_content = replace_html;
        el.param = param;

        return el;
      }),
    );

    // payload utama notif
    const payload = {
      origin: 'reporting.keyword_with_stock',
      tracing_id: '',
      tracing_master_id: '',
      notification: notifications,
    };

    // console.log(payload);
    console.log('-> Emit to notification_general ..');
    // console.log(payload);
    await this.notificationGeneralClient.emit(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC, payload);
  }
}
