import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Campaign } from '@/campaign/models/campaign.model';

export type CampaignRecipientDocument = CampaignRecipient & Document;

export enum CampaignRecipientStatus {
  NEW = 'new',
  PROCESSSING = 'processing',
  SUCCESS = 'success',
  FAIL = 'fail',
  INVALID = 'invalid',
}

@Schema(
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
)
export class CampaignRecipient {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Campaign.name })
  @Type(() => Campaign)
  campaign_id: Campaign;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  // value from CampaignRecipientStatus
  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({ type: SchemaTypes.String })
  fail_message: string;

  @Prop({ type: SchemaTypes.Number })
  try_count: number;

  @Prop({ type: SchemaTypes.Boolean })
  is_valid_msisdn: boolean;

  @Prop({ type: SchemaTypes.String })
  broadcast_batch: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  created_by: any | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_cancelled: boolean;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  cancelled_at: Date | null;

  @Prop({ type: SchemaTypes.ObjectId })
  deleted_by?: string; 

  constructor(
    campaign_id?: Campaign,
    msisdn?: string,
    status?: string,
    fail_message?: string,
    try_count?: number,
    is_valid_msisdn?: boolean,
    broadcast_batch?: string,
    created_by?: Account | null,
  ) {
    this.campaign_id = campaign_id;
    this.msisdn = msisdn;
    this.status = status;
    this.fail_message = fail_message;
    this.try_count = try_count;
    this.is_valid_msisdn = is_valid_msisdn;
    this.broadcast_batch = broadcast_batch;
    this.created_by = created_by;
  }
}

export const CampaignRecipientSchema =
  SchemaFactory.createForClass(CampaignRecipient);
