import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumberString, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type VoucherDocument = Voucher & Document;

@Schema({
  collection: 'transaction_voucher',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Voucher {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsNumberString()
  @Prop({ type: SchemaTypes.String, required: false })
  msisdn: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  master_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  parent_master_id: string;

  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean,
    required: false,
    default: false,
  })
  need_verification: boolean;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  tracing_id: string;

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
  keyword_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword_name: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  merchant_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  merchant_name: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  channel_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  remark: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword_verification: string;

  @ApiProperty({
    required: false,
    type: Date,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Date, required: false })
  start_time: Date;

  @ApiProperty({
    required: false,
    type: Date,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Date, required: false })
  end_time: Date;

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
  @Prop({ type: SchemaTypes.String, required: false })
  file: string;

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

  @Prop({
    type: SchemaTypes.Date,
  })
  verified_date: Date;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  created_by: object;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  responseBody: object;

  @Prop({ type: SchemaTypes.Date, required: false, default: null })
  deleted_at: Date | null;
}
export const VoucherSchema = SchemaFactory.createForClass(Voucher);
