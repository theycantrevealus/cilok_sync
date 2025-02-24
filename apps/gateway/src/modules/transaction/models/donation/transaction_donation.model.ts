import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  IsDateString,
  IsNumber,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type TransactionDonationDocument = TransactionDonation & Document;

@Schema({ collection: 'transaction_donation' })
export class TransactionDonation {
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  master_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  parent_master_id: string;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  trace_id: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  keyword: Types.ObjectId;

  @IsNumberString()
  @MinLength(10)
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  msisdn: string;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
  })
  total_redeem: number;

  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  time: Date;

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
}

export const TransactionDonationSchema =
  SchemaFactory.createForClass(TransactionDonation);
