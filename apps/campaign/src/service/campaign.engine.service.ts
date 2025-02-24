import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import {
  CampaignRecipient,
  CampaignRecipientStatus,
} from '@/campaign/models/campaign.recipient.model';

import { CampaignMessageDto } from '../models/campaign-message.dto';
import { CampaignNotificationService } from './campaign.notification.service';

@Injectable()
export class CampaignEngineService {
  protected campaignNotification: CampaignNotificationService;

  constructor(
    campaignNotification: CampaignNotificationService,

    @InjectModel(CampaignRecipient.name)
    protected recipient: Model<CampaignRecipient>,
  ) {
    this.campaignNotification = campaignNotification;
  }

  async send_campaign(payload: CampaignMessageDto): Promise<boolean> {
    const is_send = await this.campaignNotification.send_campaign_factory(
      payload,
    );
    await this.update_receipt(payload, is_send);
    return true;
  }

  async update_receipt(payload: CampaignMessageDto, is_send: boolean) {
    let updatedData = {};

    try {
      if (is_send) {
        updatedData = {
          status: CampaignRecipientStatus.SUCCESS,
          broadcast_batch: payload.campaign_broadcast_batch,
        };

        await this.recipient.updateOne(
          {
            _id: new ObjectId(payload.campaign_recipient_id),
          },
          updatedData,
        );
      } else {
        const increment = 1;
        await this.recipient.updateOne(
          {
            _id: new ObjectId(payload.campaign_recipient_id),
          },
          {
            status: CampaignRecipientStatus.FAIL,
            $inc: { try_count: +increment },
          },
        );
      }
    } catch (err) {
      console.error(`[x] UPDATE CAMPAIGN RECIPIENT : ${err}`);
    }
  }
}
