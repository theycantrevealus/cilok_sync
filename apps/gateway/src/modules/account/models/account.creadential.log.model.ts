import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Channel } from '@/channel/models/channel.model';

import { Account } from './account.model';
export type AccountCredentialLogDocument = AccountCredentialLog & Document;

@Schema()
export class AccountCredentialLog {
  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  account: Account;

  @Prop({ type: SchemaTypes.String })
  token: string;

  @Prop({ type: SchemaTypes.String })
  token_refresh: string;

  @Prop({ type: Types.ObjectId, ref: Channel.name })
  @Type(() => Channel)
  channel: Channel | null;

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

  constructor(
    account?: Account,
    token?: string,
    token_refresh?: string,
    channel?: Channel | null,
  ) {
    this.account = account;
    this.token = token;
    this.token_refresh = token_refresh;
    this.channel = channel;
  }
}

export const AccountCredentialLogSchema =
  SchemaFactory.createForClass(AccountCredentialLog);
