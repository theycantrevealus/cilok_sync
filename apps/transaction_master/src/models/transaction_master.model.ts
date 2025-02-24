import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumberString, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type TransactionMasterDocument = TransactionMaster & Document;

@Schema({
  collection: 'transaction_master',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class TransactionMaster {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  parent_transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  channel_transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  customer_location_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword_location_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  product_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  notification_code: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  max_redeemer_id: string;

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
  origin: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  msisdn: string;

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
  sys_timezone: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  cust_timezone: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  created_by: string;

  @Prop({
    type: SchemaTypes.Date,
    // default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  transaction_date: Date;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword_verification: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  program_name: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  program: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  error_code: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, required: false, default: false })
  is_recovery_result: boolean;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, required: false, default: false })
  is_flashsale: boolean;

  @Prop({
    type: SchemaTypes.Date,
    // default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  bonus: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  error_desc: string;

  @ApiProperty({
    required: false,
    type: Number,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Number, required: false })
  poin: number;

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
  transaction_source: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  business_id: string;
}
export const TransactionMasterSchema =
  SchemaFactory.createForClass(TransactionMaster);
