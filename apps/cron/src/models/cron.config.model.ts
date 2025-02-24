import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";

export type CronConfigDocument = CronConfig & Document;

@Schema({
  timestamps : {
    createdAt : true,
    updatedAt : true
  }
})
export class CronConfig {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId;

  // example: KAFKA, EMAIL, SMS
  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

  // crontab format
  @Prop({ type: SchemaTypes.String })
  interval: string;

  // topic emit to kafka
  @Prop({ type: SchemaTypes.String })
  target_topic: string;

  // cron status
  @Prop({ type: SchemaTypes.Boolean })
  is_running: boolean;

  // cron if need restart after update
  @Prop({ type: SchemaTypes.Boolean })
  need_restart: boolean;

  @Prop({ type: SchemaTypes.Mixed })
  payload: any;

  @Prop({ type: SchemaTypes.Mixed })
  pending_for: CronConfig;

  @Prop({ type: SchemaTypes.Mixed })
  periode: any;

  // flag for running at which server, set at env
  @Prop({ type: SchemaTypes.String })
  server_identifier: string;

  @Prop({ type: Date, default: null })
  last_running_time: Date;

  constructor(
    type: string,
    name: string,
    description: string,
    target_topic: string,
    interval: string,
    payload: any,
    is_running = true,
    need_restart = false,
    periode: any = null,
    server_identifier: string,
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.target_topic = target_topic;
    this.interval = interval;
    this.is_running = is_running;
    this.payload = payload;
    this.need_restart = need_restart;
    this.periode = periode;
    this.server_identifier = server_identifier;
  }
}

export const CronConfigSchema = SchemaFactory.createForClass(CronConfig);


