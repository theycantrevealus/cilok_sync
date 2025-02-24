import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type BatchProcessLogDocument = BatchProcessLog & Document;

export enum BatchProcessEnum {
  UPLOADED = 'uploaded',
  WAITING = 'waiting',
  PROCESSSING = 'processing',
  DONE = 'done',
  FAIL = 'fail',
}

export enum IdentifierEnum {
  MSISDN = 'msisdn',
  INDIHOME = 'indihome',
  TSELID = 'tselid'
}

@Schema({
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
})
export class BatchProcessLog {
  @Prop({ type: SchemaTypes.String, index: true })
  origin_name: string;

  @Prop({ type: SchemaTypes.String })
  internal_name: string;

  @Prop({ type: SchemaTypes.String, index: true })
  transaction: string;

  @Prop({ type: SchemaTypes.String, enum: BatchProcessEnum, index: true })
  status: string;
  
  @Prop({ default: null })
  error: string;

  @Prop({ type: SchemaTypes.String, enum : IdentifierEnum, index: true })
  identifier: string;

}

export const BatchProcessLogSchema =
  SchemaFactory.createForClass(BatchProcessLog);
