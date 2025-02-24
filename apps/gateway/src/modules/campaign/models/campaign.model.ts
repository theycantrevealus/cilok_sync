import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import mongoose, {SchemaTypes} from "mongoose";
import {Type} from "class-transformer";
import {Account} from "@/account/models/account.model";
import {TimeManagement} from "@/application/utils/Time/timezone";
import {CampaignNotificationConfig} from "@/campaign/models/campaign.notification.config.model";

export type CampaignDocument = Campaign & Document;

export enum CampaignType {
  BROADCAST = 'BROADCAST',
  ANALYTIC = "ANALYTIC",
}

@Schema(
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
)
export class Campaign {
  // value from CampaignType
  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

  @Prop({ type: SchemaTypes.Mixed })
  @Type(() => CampaignNotificationConfig)
  notification_config: CampaignNotificationConfig;

  @Prop({ type: SchemaTypes.String })
  execute_time: string;

  @Prop({ type: SchemaTypes.Mixed })
  additional: any;

  @Prop({ type: SchemaTypes.String })
  file_recipient: string;

  @Prop({ type: SchemaTypes.Number })
  total_recipient: number;

  @Prop({ type: SchemaTypes.Number })
  recipient_uploaded: number;

  @Prop({ type: SchemaTypes.Number })
  recipient_valid: number;

  @Prop({ type: SchemaTypes.Number })
  sent: any;

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

  constructor(
    name?: string,
    description?: string,
    notification_config?: CampaignNotificationConfig,
    execute_time?: string,
    additional?: any,
    created_by?: Account | null,
  ) {
    this.name = name;
    this.description = description;
    this.notification_config = notification_config;
    this.execute_time = execute_time;
    this.additional = additional;
    this.created_by = created_by;
  }
}

export const CampaignSchema = SchemaFactory.createForClass(
  Campaign
);
