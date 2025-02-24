import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Lov } from '@/lov/models/lov.model';
import { NotificationTemplate } from '@/notification/models/notification.model';
export type CampaignDocument = Campaign & Document;

/**
 * @deprecated
 */
@Schema(
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
)
export class Campaign {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  notification_type: Lov;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: NotificationTemplate.name,
  })
  @Type(() => NotificationTemplate)
  notification_template: NotificationTemplate;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  notif_via: Lov;

  @Prop({ type: SchemaTypes.String })
  notification_content: string;

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
    notification_type?: Lov,
    notification_template?: NotificationTemplate,
    notif_via?: Lov,
    notification_content?: string,
    created_by?: Account | null,
  ) {
    this.notification_type = notification_type;
    this.notification_template = notification_template;
    this.notif_via = notif_via;
    this.notification_content = notification_content;
    this.created_by = created_by;
  }
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
