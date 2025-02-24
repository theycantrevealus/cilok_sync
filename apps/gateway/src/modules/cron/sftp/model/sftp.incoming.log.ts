import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes} from "mongoose";
import {TimeManagement} from "@/application/utils/Time/timezone";


export type SftpIncomingDocument = SftpIncomingLog & Document;

@Schema()
export class SftpIncomingLog {

  @Prop({ type: SchemaTypes.String })
  source: string;

  @Prop({ type: SchemaTypes.String })
  file_name: string;

  @Prop({ type: SchemaTypes.String })
  file_path: string;

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
    source: string,
    fileName: string,
    filePath: string,
  ) {
    this.source = source;
    this.file_name = fileName;
    this.file_path = filePath;
  }
}

export const SftpIncomingLogSchema = SchemaFactory.createForClass(SftpIncomingLog);
