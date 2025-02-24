import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';

export type VoucherImportDocument = VoucherImport & Document;

@Schema({
  collection: 'voucher_import',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class VoucherImport {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: String, required: false })
  keyword_id: string;

  @ApiProperty({
    required: false,
    default: 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  total_insert: number;

  @ApiProperty({
    required: false,
    type: Boolean,
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, required: false, default: false })
  insert_done: boolean;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  location: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  exp_voucher: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  voucher_type: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  merchant: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  type: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  code: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  prefix: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  suffix: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  combination: string;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Number, required: false })
  digit_length: number;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  batch_no: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  desc: string;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false })
  stock: number;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  status: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Mixed, required: false })
  file: any;

  @ApiProperty({
    required: false,
    type: Date,
    name: 'start_time',
    example: '2022-12-31T00:00:00.000Z',
  })
  @IsDateString()
  @Prop({ type: SchemaTypes.Date, required: false })
  start_time: Date;

  @ApiProperty({
    required: false,
    type: Date,
    name: 'end_time',
    example: '2022-12-31T00:00:00.000Z',
  })
  @IsDateString()
  @Prop({ type: SchemaTypes.Date, required: false })
  end_time: Date;

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

  @Prop({ type: SchemaTypes.Mixed, required: false })
  created_by: object;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  responseBody: object;
}
export const VoucherImportSchema = SchemaFactory.createForClass(VoucherImport);
