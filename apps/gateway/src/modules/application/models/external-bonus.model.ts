import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type ExternalBonusLogDocument = ExternalBonusLog & Document;

export enum ExternalBonusEnum {
  LINK_AJA_BONUS = 'link_aja_bonus',
  LINK_AJA_MAIN = 'link_aja_main',
  LINK_AJA_VOUCHER = 'link_aja_voucher',
  NGRS = 'ngrs',
  TELCO_POSTPAID = 'telco_postpaid',
  TELCO_PREPAID = 'telco_prepaid',
}

@Schema({
  collection: 'transaction_external_bonus',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ExternalBonusLog {
  @Prop({ type: SchemaTypes.String, index: true })
  keyword: string;

  @Prop({ type: SchemaTypes.String, index: true })
  trace_id: string;

  @Prop({ type: SchemaTypes.String, index: true })
  master_id: string;

  @Prop({ type: SchemaTypes.String, required: true })
  parent_master_id: string;

  @Prop({ type: SchemaTypes.String, index: true })
  msisdn: string;

  @Prop({ type: SchemaTypes.String, enum: ExternalBonusEnum })
  bonus_type: string;

  @Prop({ type: Object })
  request: object;

  @Prop({ type: Object })
  response: object;

  @Prop({ type: SchemaTypes.Boolean })
  is_success: boolean;

  @Prop({ type: Object, required: false })
  error: object;
}

export const ExternalBonusLogSchema =
  SchemaFactory.createForClass(ExternalBonusLog);
