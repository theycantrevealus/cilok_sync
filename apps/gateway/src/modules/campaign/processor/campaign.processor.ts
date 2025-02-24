import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ObjectId } from 'bson';
import { Job, Queue } from 'bull';
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
import { CampaignServiceV1 } from '@/campaign/services/campaign.service.v1';
import {
  CustomerTier,
  CustomerTierDocument,
} from '@/customer/models/customer.tier.model';
import { firstValueFrom } from 'rxjs';

@Processor('campaign')
export class CampaignProcessor {
  protected loadFileQueue: Queue;
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,

    @InjectModel(CampaignRecipient.name)
    private campaignRecipientModel: Model<CampaignRecipientDocument>,

    @InjectModel(CampaignBroadcastSchedule.name)
    private campaignBroadcastScheduleModel: Model<CampaignBroadcastScheduleDocument>,

    @InjectModel(CustomerTier.name)
    private customerTierModel: Model<CustomerTierDocument>,

    @InjectQueue('campaign')
    loadFileQueue: Queue,

    private schedulerRegistry: SchedulerRegistry,

    private campaignService: CampaignServiceV1,

    @Inject('CAMPAIGN')
    private readonly client: ClientKafka,
  ) {
    this.loadFileQueue = loadFileQueue;

    this.client.connect().catch((e) => {
      this.logger.error(e);
    });
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing campaign job ${job.id} of type ${job.name}...`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(
      `Campaign job ${job.id} of type ${job.name} is in progress now...`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(
      `Campaign job ${job.id} of type ${job.name} is completed now...`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    console.log(
      `Campaign job ${job.id} of type ${job.name} is failed...`,
      `Reason: ${job.failedReason}`,
      `Stacktrace:`,
    );
    console.log(job.stacktrace);
  }

  @Process('broadcast-now')
  async broadcastCampaign(job: Job): Promise<void> {
    const payload = job.data as any;
    // set data type payload { cron_name, campaign, schedule  }
    const { cron_name, campaign, schedule } = payload;

    console.log(`broadcast-now cron_name ${cron_name}`);

    await firstValueFrom(this.client.emit('campaign', payload)).then(() => {
      console.log(`cron_name ${cron_name} emit to topic campaign`);
    });

    // remove schedule from cron
    this.schedulerRegistry.deleteCronJob(cron_name);
    this.logger.verbose(`Broadcast job ${cron_name} has deleted...`);

    // const recipients = await this.campaignRecipientModel
    //   .find({
    //     campaign_id: campaign._id,
    //     status: CampaignRecipientStatus.NEW,
    //     is_valid_msisdn: true,
    //     deleted_at: null,
    //     is_cancelled: false,
    //   })
    //   .exec();

    // console.log(`broadcast-campaign ${campaign._id} job`, job);
    // console.log(`broadcast-campaign ${campaign._id} recipents`, recipients);

    // const recipientIds = [];
    // const recipientPayload = [];
    // for (const item of recipients) {
    //   // arrange payload for emit to notif
    //   const payload = {
    //     campaign_id: campaign._id.toString(),
    //     campaign_recipient_id: item._id.toString(),
    //     campaign_broadcast_batch: schedule.batch,
    //     msisdn: item.msisdn,
    //     notification_config: {
    //       content: schedule.notification_content,
    //       via: campaign.notification_config.via,
    //     },
    //   };

    //   recipientPayload.push(payload);
    //   recipientIds.push(item._id);
    // }

    // await this.campaignBroadcastScheduleModel.findOneAndUpdate(
    //   {
    //     _id: new ObjectId(schedule._id.toString()),
    //     deleted_at: null,
    //     is_cancelled: false
    //   },
    //   {
    //     updated_at: Date.now(),
    //     is_execute: true,
    //   },
    // );

    // await this.campaignRecipientModel.updateMany(
    //   { _id: recipientIds },
    //   {
    //     updated_at: Date.now(),
    //     status: CampaignRecipientStatus.PROCESSSING,
    //   },
    // );

    // // send to campaign topic
    // for (let i = 0; i < recipientPayload.length; i++) {
    //   await this.client.emit('campaign', recipientPayload[i]).subscribe({
    //     error: (err) => {
    //       this.logger.error(err);
    //     },
    //   });
    //   console.log(
    //     `broadcast-campaign ${campaign._id} emit recipient`,
    //     recipientPayload[i],
    //   );
    // }

    // // remove schedule from cron
    // this.schedulerRegistry.deleteCronJob(cron_name);
    // this.logger.verbose(`Broadcast job ${cron_name} has deleted...`);
  }

  @Process('rebroadcast-now')
  async rebroadcastCampaign(job: Job): Promise<void> {
    const payload = job.data as any;
    // set data type payload { cron_name, campaign, schedule  }
    const { cron_name, campaign, schedule } = payload;

    const recipients = await this.campaignRecipientModel
      .find({
        campaign_id: campaign._id,
        status: CampaignRecipientStatus.FAIL,
        is_valid_msisdn: true,
        deleted_at: null,
        is_cancelled: false,
      })
      .exec();

    console.log(
      `Campaign Id ${campaign._id.toString()} recipients`,
      recipients,
    );

    const recipientIds = [];
    const recipientPayload = [];
    for (const item of recipients) {
      // arrange payload for emit to notif
      const payload = {
        campaign_id: campaign._id.toString(),
        campaign_recipient_id: item._id.toString(),
        campaign_broadcast_batch: schedule.batch,
        msisdn: item.msisdn,
        notification_config: {
          content: schedule.notification_content,
          via: campaign.notification_config.via,
        },
      };

      recipientIds.push(item._id);
      recipientPayload.push(payload);
    }

    await this.campaignBroadcastScheduleModel.findOneAndUpdate(
      {
        _id: new ObjectId(schedule._id.toString()),
        deleted_at: null,
      },
      {
        updated_at: Date.now(),
        is_execute: true,
      },
    );

    // update first data in processing for avoid race condition
    await this.campaignRecipientModel.updateMany(
      { _id: recipientIds },
      {
        updated_at: Date.now(),
        status: CampaignRecipientStatus.PROCESSSING,
      },
    );

    // send to campaign topic
    for (let i = 0; i < recipientPayload.length; i++) {
      await this.client.emit('campaign', recipientPayload[i]).subscribe({
        error: (err) => {
          this.logger.error(err);
        },
      });
      console.log(
        `Campaign Id ${campaign._id.toString()} recipient emit to topic campaign`,
        recipientPayload[i],
      );
      this.logger.verbose(
        `Campaign Id ${campaign._id.toString()} recipient ${recipientPayload[
          i
        ]._id.toString()} emit to topic campaign`,
      );
    }

    // remove schedule from cron
    this.schedulerRegistry.deleteCronJob(cron_name);
    this.logger.verbose(`Broadcast job ${cron_name} has deleted...`);
  }

  @Process('analytic-customer')
  async addRecipientForAnalytic(job: Job) {
    const filter = job.data.filter as any;
    const token = job.data.token;
    const campaignId = job.data.campaign_id;
    const limit = 100;
    const allCustomer = [];

    const getCustomer = await this.campaignService.getCoreCustomerSegmentation(
      filter,
      token,
      limit,
      0,
    );

    const total = getCustomer.total;
    allCustomer.push(...getCustomer.data);

    /**
     * Important!
     * Core only can provide 100 data,
     * even you set 1000 for limit
     */
    if (total > limit) {
      let initalSkip = limit;
      const length = Math.ceil(total / limit);

      for (let j = 0; j < length - 1; j++) {
        const paginationCust =
          await this.campaignService.getCoreCustomerSegmentation(
            filter,
            token,
            limit,
            initalSkip,
          );

        allCustomer.push(...paginationCust.data);
        initalSkip += limit;
      }
    }

    const bulkData = [];
    for (let i = 0; i < allCustomer.length; i++) {
      try {
        const phone = allCustomer[i]?.phone.split('|')[0];
        const testRegex = new RegExp(
          /^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/,
        );

        const recipient = {
          campaign_id: campaignId,
          status: CampaignRecipientStatus.NEW,
          msisdn: phone,
          is_valid_msisdn: testRegex.test(phone),
        };

        bulkData.push(recipient);
      } catch (e) {
        this.logger.error(e);
      }
    }

    this.logger.verbose(`All cust: ` + allCustomer.length);
    this.logger.verbose(`Total: ` + bulkData.length);
    await this.campaignRecipientModel.insertMany(bulkData);
  }
}
