import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Location } from '@/location/models/location.model';

import { Account } from './account.model';
export type AccountLocationDocument = AccountLocation & Document;

@Schema()
export class AccountLocation {
  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  account: Account;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Account)
  location: Location;

  @Prop({ type: SchemaTypes.String, required: false, default: null })
  agent: string;

  constructor(account?: Account, location?: Location) {
    this.account = account;
    this.location = location;
  }
}

export const AccountLocationSchema =
  SchemaFactory.createForClass(AccountLocation);
