import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';

export type VoucherUpdateDocument = VoucherUpdate & Document;

@Schema({
  collection: 'voucher_update',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class VoucherUpdate {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type:  String, required: false })
  keyword_id: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type:  String, required: false })
  keyword_name: string;
  
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type:  String, required: false })
  batch_no: string;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type:  String, required: false })
  task_id: string;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  response_core: any;

  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type:  String, required: false })
  status: string;

  @ApiProperty({
    required: false,
    default : 0,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: false, default : 0 })
  total_affected: number;

  @Prop({ type: SchemaTypes.Mixed, required: false })
  created_by: object;

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
export const VoucherUpdateSchema = SchemaFactory.createForClass(VoucherUpdate);
