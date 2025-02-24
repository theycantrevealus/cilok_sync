import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsNumber } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';
import { Program } from '@/program/models/program.model';
export type ReportKeywordDocument = ReportKeyword & Document;

@Schema({ collection: 'report_keyword' })
export class ReportKeyword {
  @ApiProperty({
    description: 'Parent Program (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Program.name })
  @IsMongoId()
  program: Types.ObjectId;

  @ApiProperty({
    description: 'Date transaction, which is equal to report date',
  })
  @Prop({
    type: SchemaTypes.Date,
  })
  @IsDateString()
  date: Date;

  @ApiProperty({
    description: 'All Keywords related to report`s Parent Program (Object ID)',
    default: '631078e514dfee6e105347c0',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Keyword.name })
  @IsMongoId()
  keyword: Types.ObjectId;

  @ApiProperty({
    description:
      'Total Success transaction from start period until report date-hour.',
    default: 100,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_success: number;

  @ApiProperty({
    description:
      'Total Failed transaction per keyword from start period until report date-hour.',
    default: 100,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_failed: number;

  @ApiProperty({
    description:
      'Total transactions per keyword from start period until report date-hour.',
    default: 100,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_transaction: number;

  @ApiProperty({
    description: 'Remaining stock per keyword on report date-hour.',
    default: 100,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  remaining_stock: number;

  @ApiProperty({
    description: 'Default stock per keyword on report date-hour.',
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  default_stock: number;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    program: Types.ObjectId,
    date: Date,
    keyword: Types.ObjectId,
    total_success: number,
    total_failed: number,
    total_transaction: number,
    remaining_stock: number,
    default_stock: number,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
  ) {
    this.program = program;
    this.date = date;
    this.keyword = keyword;
    this.total_success = total_success;
    this.total_failed = total_failed;
    this.total_transaction = total_transaction;
    this.remaining_stock = remaining_stock;
    this.default_stock = default_stock;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }
}

export const ReportKeywordSchema = SchemaFactory.createForClass(ReportKeyword);
