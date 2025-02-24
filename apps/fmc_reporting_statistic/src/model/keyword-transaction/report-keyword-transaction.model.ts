import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
} from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

const moment = require('moment-timezone');
import { TimeManagement } from '@/application/utils/Time/timezone';

export type ReportKeywordTransactionDocument = ReportKeywordTransaction & Document;

@Schema({ collection: 'report_keyword_transaction' })
export class ReportKeywordTransaction {
  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @ApiProperty({
    description: 'All Keywords related to report’s Parent Program',
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  keyword_name: string;

  @ApiProperty({
    description: 'Total Success transaction from start period until report date-hour',
    type: Number,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_success;

  @ApiProperty({
    description: 'Total Failed transaction per keyword from start period until report date-hour',
    type: Number,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_fail;

  @ApiProperty({
    description: ' Total transactions per keyword from start period until report date-hour',
    type: Number,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_trx;

  @ApiProperty({
    description: 'All Keywords related to report’s Parent Program',
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  program_name: string;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  start_period: Date | null;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  end_period: Date | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const ReportKeywordTransactionSchema = SchemaFactory.createForClass(ReportKeywordTransaction);
