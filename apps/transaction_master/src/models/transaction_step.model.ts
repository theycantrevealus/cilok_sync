import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes} from "mongoose";

export type TransactionStepDocument = TransactionStepModel & Document;

@Schema({
  collection: 'transaction_steps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at'}
})
export class TransactionStepModel {
  @Prop({
    required: false,
  })
  transaction_id: string;

  @Prop({
    required: false,
    type: SchemaTypes.Mixed
  })
  payload: any;

  @Prop({
    required: false,
    type: SchemaTypes.Mixed
  })
  step: any;
}

export const TransactionStepSchema =
  SchemaFactory.createForClass(TransactionStepModel);
