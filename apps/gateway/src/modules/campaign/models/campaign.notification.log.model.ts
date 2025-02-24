import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type CampaignNotificationLogDocument = CampaignNotificationLog &
  Document;

@Schema({
  collection: 'campaign_notification_log',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
export class CampaignNotificationLog {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  campaign_recipient_id: string;

  // @Prop({ type: String, index: true })
  // campaign_schedule_brodcast: string;

  // @Prop({ type: String, index: true })
  // msisdn: string;

  @Prop({ type: String, index: true })
  via: string;

  @Prop({ type: Boolean, index: true })
  is_send: boolean;

  @Prop({ type: Object })
  request: any;

  @Prop({ type: Object })
  response: any;

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
}

export const CampaignNotificationLogSchema = SchemaFactory.createForClass(
  CampaignNotificationLog,
);
