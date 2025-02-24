import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '@/lov/models/lov.model';
import { Channel } from '@/channel/models/channel.model';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { send } from 'process';
export type NotificationFirebasDocument = NotificationFirebase & Document;

@Schema()
export class NotificationFirebase {
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  tracing_id: string;

  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  tracing_master_id: string;

  @Prop({type: SchemaTypes.String, required:true})
  title: string

  @Prop({type: SchemaTypes.String})
  content: string;
  
  @Prop({type: SchemaTypes.String,default: null })
  keyword_id: string;

  @Prop({type: SchemaTypes.String,default: null})
  program_id: string;
  
  @Prop({type: SchemaTypes.Boolean, default: false})
  is_read: boolean;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  receiver_id: Account;

  @Prop({type: SchemaTypes.String})
  receiver_name: string;

  @Prop({type: SchemaTypes.String})
  receiver_email: string;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  sender_id: Account;

  @Prop({type: SchemaTypes.String})
  sender_name: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: true,
  })
  @Type(() => Account)
  created_by: Account | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
   title?:string,
   content?: string,
   is_read?: boolean,
   receiver_id?: Account,
   receiver_name?: string,
   sender_id?: Account,
   sender_name?: string,
   created_by?: Account | null,
  ) {
   this.title = title;
   this.content = content;
   this.is_read = is_read;
   this.receiver_id = receiver_id;
   this.receiver_name = receiver_name;
   this.sender_id = sender_id;
   this.sender_name = sender_name;
   this.created_by = created_by;
  }
}

export const NotificationFirebaseSchema =
  SchemaFactory.createForClass(NotificationFirebase);
