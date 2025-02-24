import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '@/notification/models/notification.model';

import {
  ReportErrorRedeemerTrends,
  ReportErrorRedeemerTrendsDocument,
} from '../../model/error-redeemer-trends/error.redeemer.trends.model';
import {
  ReportErrorRedeemerTrendsSummary,
  ReportErrorRedeemerTrendsSummaryDocument,
} from '../../model/error-redeemer-trends/error.redeemer.trends.summary.model';

@Injectable()
export class ReportingErrorRedeemerTrendsService {
  constructor(
    @InjectModel(NotificationTemplate.name)
    private notificationTemplateModel: Model<NotificationTemplateDocument>,

    @InjectModel(ReportErrorRedeemerTrends.name, 'reporting')
    private reportErrorRedeemerTrendsModel: Model<ReportErrorRedeemerTrendsDocument>,

    @InjectModel(ReportErrorRedeemerTrendsSummary.name, 'reporting')
    private reportErrorRedeemerTrendsSummaryModel: Model<ReportErrorRedeemerTrendsSummaryDocument>,
  ) {}

  async createErrorRedeemerTrends(period, payload) {
    const notificationPayload = payload.notification?.[0];
    if (notificationPayload) {
      const notifData = await this.notificationTemplateModel.findOne({
        notif_content: notificationPayload.template_content,
      });

      if (notifData) {
        const dataPayload = {
          period: period,
          keyword: payload.keyword.eligibility.name,
          log_event: notifData.notif_name,
        };

        const update = {
          $inc: { total: 1 },
          $set: {
            updated_at: new Date(),
            notification_message: notifData.notif_content,
          }
        };
        const options = { upsert: true };
        return await this.reportErrorRedeemerTrendsModel
          .updateOne(dataPayload, update, options)
          .catch((e: BadRequestException) => {
            throw new BadRequestException(e.message); //Error untuk mongoose
          })
          .then(async (data) => {
            return data;
          });
      }
    }
  }
}
