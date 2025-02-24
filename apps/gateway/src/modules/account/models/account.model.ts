import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { Role } from './role.model';
export type AccountDocument = Account & Document;

@Schema()
export class Account {
  @Prop({ type: SchemaTypes.String })
  user_id: string;

  @Prop({ type: SchemaTypes.String, required: false, default: '' })
  core_role: string;

  @Prop({ type: SchemaTypes.String })
  user_name: string;

  @Prop({ type: SchemaTypes.String })
  first_name: string;

  @Prop({ type: SchemaTypes.String })
  last_name: string;

  @Prop({ type: SchemaTypes.String })
  job_title: string;

  @Prop({ type: SchemaTypes.String })
  job_level: string;

  @Prop({ type: SchemaTypes.String })
  phone: string;

  @Prop({ type: SchemaTypes.String })
  email: string;

  @Prop({ type: SchemaTypes.Date })
  birthdate: Date;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({ type: SchemaTypes.String })
  line_id: string;

  @Prop({
    type: SchemaTypes.String,
    enum: ['merchant', 'business'],
    default: 'merchant',
  })
  type: string;

  @Prop({
    type: Types.ObjectId,
    ref: Role.name,
    required: false,
    default: null,
  })
  @Type(() => Role)
  role: Role;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  superior_local: Account;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  superior_hq: Account;

  @Prop({ type: SchemaTypes.String })
  manager_id: string;

  @Prop({ type: SchemaTypes.String, required: false, default: null })
  agent: string;

  @Prop({ type: SchemaTypes.String, required: false, default: null })
  legacy_user_id: string;

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

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;


  @Prop({ type: SchemaTypes.Mixed })
  account_location: any;

  constructor(
    user_id?: string,
    user_name?: string,
    first_name?: string,
    last_name?: string,
    job_title?: string,
    job_level?: string,
    phone?: string,
    email?: string,
    role?: Role,
  ) {
    this.user_id = user_id;
    this.user_name = user_name;
    this.first_name = first_name;
    this.last_name = last_name;
    this.job_title = job_title;
    this.job_level = job_level;
    this.phone = phone;
    this.email = email;
    this.role = role;
  }
}

export const AccountSchema = SchemaFactory.createForClass(Account);
