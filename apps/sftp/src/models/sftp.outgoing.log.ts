import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes} from "mongoose";
import {TimeManagement} from "@/application/utils/Time/timezone";
import {SftpConfig} from "./sftp.config.model";

export type SftpOutgoingLogDocument = SftpOutgoingLog & Document;

@Schema({collection: "sftp_outgoing_logs"})
export class SftpOutgoingLog {

  @Prop({ type: SchemaTypes.Mixed })
  sftp_config: SftpConfig;

  @Prop({ type: SchemaTypes.String })
  file_at_local: string;

  @Prop({ type: SchemaTypes.String })
  destination_label: string;

  @Prop({ type: SchemaTypes.String })
  destination_host: string;

  @Prop({ type: SchemaTypes.String })
  destination_path: string;

  @Prop({ type: SchemaTypes.String })
  status_code: string;

  @Prop({ type: SchemaTypes.String })
  error_message: string;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  constructor(
    destination_label: string,
    host: string,
    filePath: string,
  ) {
    this.destination_label = destination_label;
    this.destination_host = host;
    this.destination_path = filePath;
  }
}

export const SftpOutgoingLogSchema = SchemaFactory.createForClass(SftpOutgoingLog);
