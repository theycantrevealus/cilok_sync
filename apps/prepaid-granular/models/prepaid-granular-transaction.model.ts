import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type PrepaidGranularTransactionDocument = PrepaidGranularTransaction &
  Document;

@Schema()
export class PrepaidGranularTransaction {
  @Prop({
    unique: true,
    isRequired: true,
    type: String,
  })
  order_id: string;

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
}

export const PrepaidGranularTransactionSchema = SchemaFactory.createForClass(
  PrepaidGranularTransaction,
);
