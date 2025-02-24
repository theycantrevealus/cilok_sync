import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type TransactionBiLogDocument = TransactionBiLog & Document;

@Schema({
  collection: 'transaction_bi_log',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class TransactionBiLog {
  @Prop({ type: SchemaTypes.String, index: true })
  trace_id: string;

  @Prop({ type: SchemaTypes.String, index: true })
  master_id: string;

  @Prop({ type: Object })
  request: object;

  @Prop({ type: Object })
  response: object;

  @Prop({ type: SchemaTypes.Boolean })
  is_success: boolean;

  @Prop({ type: Object, required: false })
  error: object;
}

export const TransactionBiLogSchema =
  SchemaFactory.createForClass(TransactionBiLog);
