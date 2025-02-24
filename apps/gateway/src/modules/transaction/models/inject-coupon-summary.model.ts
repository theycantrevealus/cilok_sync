import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { Keyword } from '@/keyword/models/keyword.model';
import { ProgramV2 } from '@/program/models/program.model.v2';

export type InjectCouponSummaryDocument = InjectCouponSummary & Document;

@Schema({
  collection: 'transaction_inject_coupon_summary',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class InjectCouponSummary {
  @Prop({ type: SchemaTypes.ObjectId, ref: ProgramV2.name, index: true })
  program_id: ProgramV2;

  @Prop({ type: SchemaTypes.String })
  program_name: string;

  @Prop({ type: SchemaTypes.Date })
  program_start: Date;

  @Prop({ type: SchemaTypes.Date })
  program_end: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: Keyword.name, index: true })
  keyword_id: Keyword;

  @Prop({ type: SchemaTypes.String })
  keyword_name: string;

  @Prop({ type: SchemaTypes.String, index: true })
  msisdn: string;

  @Prop({ type: SchemaTypes.Number, default: 0 })
  total_coupon: number;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  synced_at: Date | null;
}

export const InjectCouponSummarySchema =
  SchemaFactory.createForClass(InjectCouponSummary);

// update countUpUserCouponSummary
InjectCouponSummarySchema.index(
  { msisdn: 1, program_name: 1, keyword_name: 1 },
  { unique: false },
);
