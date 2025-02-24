import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose'

import { TimeManagement } from '@/application/utils/Time/timezone'

export type AdjustCustomerPointDocument = AdjustCustomerPoint & Document

@Schema()
export class AdjustCustomerPoint {
  @Prop({ type: SchemaTypes.String })
  trxid: string;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.Number })
  amount: number;

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
    trxid?: string,
    msisdn?: string,
    amount?: number,
  ) {
    this.trxid = trxid
    this.msisdn = msisdn
    this.amount = amount
  }
}

export const AdjustCustomerPointSchema = SchemaFactory.createForClass(AdjustCustomerPoint);
