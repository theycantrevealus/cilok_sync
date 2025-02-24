import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location } from '@/location/models/location.model';

import { Merchant } from './merchant.model';
import { MerchantV2 } from './merchant.model.v2';
import { Outlet } from './outlet.model';
export type MerchantOutletDocument = MerchantOutlet & Document;

@Schema()
export class MerchantOutlet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: MerchantV2.name })
  @Type(() => Merchant)
  merchant: MerchantV2;

  @Prop({ type: Types.ObjectId, ref: Outlet.name })
  @Type(() => Outlet)
  outlet: string[];

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

  constructor(merchant?: MerchantV2, outlet?: string[]) {
    this.merchant = merchant;
    this.outlet = outlet;
  }
}

export const MerchantOutletSchema =
  SchemaFactory.createForClass(MerchantOutlet);
