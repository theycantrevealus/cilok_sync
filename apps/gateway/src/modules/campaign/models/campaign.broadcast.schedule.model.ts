import mongoose, {Document, SchemaTypes} from "mongoose";
import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Campaign} from "@/campaign/models/campaign.model";
import {Type} from "class-transformer";
import {Account} from "@/account/models/account.model";
import {TimeManagement} from "@/application/utils/Time/timezone";

export type CampaignBroadcastScheduleDocument = CampaignBroadcastSchedule & Document;

export enum BroadcastScheduleType {
  FIRST = 'FIRST_BROADCAST',
  RE = 'RE_BROADCAST',
}

@Schema(
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
)
export class CampaignBroadcastSchedule {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Campaign.name })
  @Type(() => Campaign)
  campaign_id: Campaign;

  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.String })
  notification_content: string;

  @Prop({ type: SchemaTypes.String })
  batch: string;

  @Prop({ type: SchemaTypes.Date })
  execute_time: Date;

  @Prop({ type: SchemaTypes.String })
  execute_schedule: string;

  @Prop({ type: SchemaTypes.Boolean, index: true })
  is_execute: boolean;

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

  @Prop({ type: SchemaTypes.Boolean, default: false, index: true })
  is_processing?: boolean;

  constructor(
    campaign_id?: Campaign,
    type?: string ,
    notification_content?: string,
    batch?: string,
    execute_time?: Date,
    execute_schedule?: string,
    is_execute?: boolean,
    created_by?: Account | null,
  ) {
    this.campaign_id = campaign_id;
    this.type = type;
    this.notification_content = notification_content;
    this.batch = batch;
    this.execute_time = execute_time;
    this.execute_schedule = execute_schedule;
    this.is_execute = is_execute;
    this.created_by = created_by;
  }
}

export const CampaignBroadcastScheduleSchema =
  SchemaFactory.createForClass(CampaignBroadcastSchedule);
