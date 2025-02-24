import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import mongoose, {SchemaTypes, Types} from "mongoose";
import {Account} from "@/account/models/account.model";
import {Type} from "class-transformer";
import {SftpIncomingLog} from "./sftp.incoming.log.model";

export type SftpResultDocument = SftpResult & Document;

@Schema({
  timestamps : {
    createdAt : true,
    updatedAt : true
  }
})
export class SftpResult {
  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  sftp_log: Account;

   @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: SftpIncomingLog.name,
  })
   @Type(() => SftpIncomingLog)
   sftp_log_id: string;

   @Prop({ type: SchemaTypes.String })
   topic: string;

   @Prop({ type: SchemaTypes.Mixed })
   data_result: any;

  /**
   * N = New data inserted
   * Updated by another service
   */
  @Prop({ type: SchemaTypes.String })
   process_status: string;
}

export const SftpResultSchema = SchemaFactory.createForClass(SftpResult);
