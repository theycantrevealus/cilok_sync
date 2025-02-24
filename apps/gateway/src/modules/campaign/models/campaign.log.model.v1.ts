import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Campaign } from '@/campaign/models/campaign.model.v1';
import { CampaignRecipient } from '@/campaign/models/campaign.recipient.model.v1';
export type CampaignLogDocument = CampaignLog & Document;

@Schema()
export class CampaignLog {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Campaign.name })
  @Type(() => Campaign)
  campaign: Campaign;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CampaignRecipient.name })
  @Type(() => CampaignRecipient)
  recipient: CampaignRecipient;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({ type: SchemaTypes.Date, default: Date.now() })
  logged_at: Date;

  constructor(
    campaign?: Campaign,
    recipient?: CampaignRecipient,
    status?: string,
  ) {
    this.campaign = campaign;
    this.recipient = recipient;
    this.status = status;
  }
}

export const CampaignLogSchema = SchemaFactory.createForClass(CampaignLog);
