import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import mongoose, {SchemaTypes} from "mongoose";
import {SftpConfig} from "./sftp.config.model";
import {Type} from "class-transformer";
import {SftpIncomingConfig} from "./sftp.incoming.config";

export type SftpIncomingLogDocument = SftpIncomingLog & Document;

@Schema({
  timestamps : {
    createdAt : true,
    updatedAt : true
  }
})
export class SftpIncomingLog {
  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: mongoose.SchemaTypes.Mixed })
  sftp_config: any;

  @Prop({ type: SchemaTypes.String })
  file_path: string;

  @Prop({ type: SchemaTypes.Number })
  row_success: number;

  @Prop({ type: SchemaTypes.Number })
  row_fail: number;

  @Prop({ type: SchemaTypes.String })
  status: string | null;

  @Prop({ type: SchemaTypes.String })
  reason: string | null;

  @Prop({ type: SchemaTypes.String })
  topic: string;
}

export const SftpIncomingLogSchema = SchemaFactory.createForClass(SftpIncomingLog);
