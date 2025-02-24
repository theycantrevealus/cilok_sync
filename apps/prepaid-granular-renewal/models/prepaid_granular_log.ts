import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {SchemaTypes, Types} from 'mongoose';

export type PrepaidGranularLogDocument = PrepaidGranularLog & Document;

export enum PrepaidGranularLogEnum {
  FAIL = 'fail',
  SUCCESS = 'success',
}
export enum PrepaidGranularTransactionEnum {
  REDEEM = 'redeem',
  SIGNIN = 'Sign-in',
  GRANULAR_CHECK = 'granular-check',
}

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class PrepaidGranularLog {
  @Prop({ type: SchemaTypes.String, index: true })
  msisdn: string;

  @Prop({ type: SchemaTypes.String, index: true })
  keyword: string;

  @Prop({type: SchemaTypes.ObjectId})
  trace_id: Types.ObjectId

  @Prop({ type: SchemaTypes.String, index: true })
  trx_id: string;

  @Prop({
    type: SchemaTypes.String,
    enum: PrepaidGranularTransactionEnum,
    index: true,
  })
  transaction_name: string;

  @Prop({ type: SchemaTypes.String, enum: PrepaidGranularLogEnum, index: true })
  status: string;

  @Prop({ type: Object })
  payload: object;
  @Prop({ type: Object })
  error: object;
}

export const PrePaidGranularLogSchema =
  SchemaFactory.createForClass(PrepaidGranularLog);
