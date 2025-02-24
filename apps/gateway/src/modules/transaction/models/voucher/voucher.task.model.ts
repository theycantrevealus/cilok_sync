import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';

export type VoucherTaskDocument = VoucherTask & Document;

@Schema({
  collection: 'voucher_task',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class VoucherTask {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: String, required: false })
  keyword_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: String, required: false })
  task_id: string;

  @ApiProperty({
    required: false,
    default: 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  total_record: number;

  @ApiProperty({
    required: false,
    default: 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  total_success: number;

  @ApiProperty({
    required: false,
    default: 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  total_fail: number;

  @ApiProperty({
    required: false,
    default: 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  accumulate_stock: number;

  @ApiProperty({
    required: false,
    type: String,
    enum: ['Processing', 'Waiting', 'Complete', 'Fail'],
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  status: string;

  @ApiProperty({
    required: false,
    type: String,
    enum: ['batch', 'upload'],
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
  remark: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Mixed, required: false })
  batch_no: any;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.Mixed, required: false })
  filename: any;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  created_by: object;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  responseBody: object;

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
}
export const VoucherTaskSchema = SchemaFactory.createForClass(VoucherTask);
