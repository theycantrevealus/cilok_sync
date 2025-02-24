import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Customer } from '@/customer/models/customer.model';
import {Campaign} from "@/campaign/models/campaign.model.v1";

export type CampaignRecipientDocument = CampaignRecipient & Document;

/**
 * @deprecated
 */
@Schema(
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
)
export class CampaignRecipient {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Campaign.name })
  @Type(() => Campaign)
  campaign: Campaign;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Customer.name })
  @Type(() => Customer)
  customer: Customer;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  email: string;

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

  constructor(
    campaign?: Campaign,
    customer?: Customer,
    msisdn?: string,
    email?: string,
  ) {
    this.campaign = campaign;
    this.customer = customer;
    this.msisdn = msisdn;
    this.email = email;
  }
}

export const CampaignRecipientSchema =
  SchemaFactory.createForClass(CampaignRecipient);
