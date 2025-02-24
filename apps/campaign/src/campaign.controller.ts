import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Kafka } from 'kafkajs';
import { Model } from 'mongoose';

import {
  CampaignBroadcastSchedule,
  CampaignBroadcastScheduleDocument,
} from '@/campaign/models/campaign.broadcast.schedule.model';
import { Campaign, CampaignDocument } from '@/campaign/models/campaign.model';
import {
  CampaignRecipient,
  CampaignRecipientDocument,
  CampaignRecipientStatus,
} from '@/campaign/models/campaign.recipient.model';

import { CampaignService } from './campaign.service';
import { CampaignEngineService } from './service/campaign.engine.service';

@Controller()
export class CampaignController {
  // KAFKA_CAMPAIGN_SERVICE
  constructor(
    private readonly campaignEngine: CampaignEngineService,
    private readonly campaignService: CampaignService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectModel(CampaignRecipient.name)
    private campaignRecipientModel: Model<CampaignRecipientDocument>,

    @InjectModel(CampaignBroadcastSchedule.name)
    private campaignBroadcastScheduleModel: Model<CampaignBroadcastScheduleDocument>,
  ) {}

  async setKafka() {
    const topic = this.configService.get('kafka.campaign.topic');
    const kafka = new Kafka({
      clientId: this.configService.get('kafka.campaign.topic'),
      brokers: this.configService.get('kafka.campaign.broker').split(' '),
    });
    const consumer = kafka.consumer({
      groupId: this.configService.get<string>('kafka.campaign.cons_group'),
    });
    await consumer.connect();
    await consumer.subscribe({
      topic,
      fromBeginning: true,
    });
    await consumer.run({
      partitionsConsumedConcurrently: 1,
      eachMessage: async ({ message }) => {
        const msg = message.value.toString();
        console.log(msg);
      },
    });

    // To move the offset position in a topic/partition
    consumer.seek({
      offset: '0',
      topic,
      partition: 0,
    });
  }

  @Get()
  getHello(): string {
    return this.campaignService.getHello();
  }

  @EventPattern('campaign')
  async campaign_transaction(payload: any) {
    const { cron_name, campaign, schedule } = payload;
    console.log(`cron_name ${cron_name} start on topic campaign`);
    const recipients = await this.campaignRecipientModel
      .find({
        campaign_id: campaign._id,
        status: CampaignRecipientStatus.NEW,
        is_valid_msisdn: true,
        deleted_at: null,
        is_cancelled: false,
      })
      .exec();

    for (const item of recipients) {
      const dataTarget = {
        campaign_id: campaign._id.toString(),
        campaign_recipient_id: item._id.toString(),
        campaign_broadcast_batch: schedule.batch,
        msisdn: item.msisdn,
        notification_config: {
          content: schedule.notification_content,
          via: campaign.notification_config.via,
        },
      };

      await this.campaignRecipientModel.updateOne(
        { _id: item._id },
        {
          updated_at: Date.now(),
          status: CampaignRecipientStatus.PROCESSSING,
        },
      );

      await this.campaignEngine.send_campaign(dataTarget);
    }

    await this.campaignBroadcastScheduleModel.updateOne(
      {
        _id: schedule._id,
        deleted_at: null,
        is_cancelled: false,
      },
      {
        updated_at: Date.now(),
        is_execute: true,
      },
    );
    console.log(`cron_name ${cron_name} completed on topic campaign`);
  }
}
