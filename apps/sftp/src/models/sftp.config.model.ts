import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";
import {SftpOutgoingConfig} from "./sftp.outgoing.config";
import {SftpIncomingConfig} from "./sftp.incoming.config";
import {SftpRunServiceConfig} from "./sftp.service.config";

export type SftpConfigDocument = SftpConfig & Document;

@Schema({
  timestamps : {
    createdAt : true,
    updatedAt : true
  }
})
export class SftpConfig {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId

  @Prop({ type: SchemaTypes.String })
  type: string;

  // use full CAPSLOCK + snake_case. Ex: INJECT_COUPON
  @Prop({ type: SchemaTypes.String })
  job_group: string;

  // crontab format
  @Prop({ type: SchemaTypes.String })
  interval: string;

  // cron status
  @Prop({ type: SchemaTypes.Boolean })
  is_running: boolean;

  // cron if need restart after update
  @Prop({ type: SchemaTypes.Boolean })
  need_restart: boolean;

  @Prop( { type: SchemaTypes.Mixed })
  additional: SftpOutgoingConfig | SftpIncomingConfig | SftpRunServiceConfig;

  constructor(
    type: string,
    job_group: string,
    interval: string,
    additional: SftpIncomingConfig | SftpOutgoingConfig | SftpRunServiceConfig,
    is_running = true,
    need_restart = false,
  ) {
    this.type = type;
    this.job_group = job_group;
    this.interval = interval;
    this.is_running = is_running;
    this.additional = additional;
    this.need_restart = need_restart;
  }
}

export const SftpConfigSchema = SchemaFactory.createForClass(SftpConfig);


