import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type TransactionMasterDetailDocument = TransactionMasterDetail &
  Document;

@Schema({
  collection: 'transaction_master_detail',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class TransactionMasterDetail extends Document {
  @Prop({ type: SchemaTypes.Mixed })
  payload: any;
}

export const TransactionMasterDetailSchema = SchemaFactory.createForClass(
  TransactionMasterDetail,
);
