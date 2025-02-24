import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type MonthlyReportUniqueMSISDNDocument = MonthlyReportUniqueMSISDN &
  Document;

@Schema({
  collection: 'report_unique_msisdn_monthly',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class MonthlyReportUniqueMSISDN {
  @ApiProperty({
    required: true,
    type: String,
    example: '2022-12',
    description: 'Period of monthly record',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  period: string;

  @ApiProperty({
    required: true,
    example: '',
    type: String,
    description: 'Subscriber Number. Format : 68xxxxxx',
  })
  @IsNumberString()
  @IsNotEmpty()
  @MinLength(10)
  @Prop({ type: SchemaTypes.String, required: true })
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Redeem Channel',
    example: {
      my_telkomsel: 0,
    },
  })
  @IsObject()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: { my_telkomsel: 0 },
  })
  redeem_channel: Record<string, any>;

  @ApiProperty({
    required: false,
    example: '',
    type: Number,
    description: 'Poin Burning Deduct',
  })
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  @IsDefined({
    message: TransactionErrorMsgResp.required.point_burning,
  })
  point_burning: number;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Poin Burning Channel',
    example: {
      my_telkomsel: 0,
    },
  })
  @IsObject()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: { my_telkomsel: 0 },
  })
  point_burning_channel: Record<string, any>;

  @ApiProperty({
    required: false,
    example: '',
    type: Number,
    description: 'Transaction Burn',
  })
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number, required: false, default: 0 })
  trx_burn: number;

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Transaction Burn Channel',
    example: {
      my_telkomsel: 0,
    },
  })
  @IsObject()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: { my_telkomsel: 0 },
  })
  trx_burn_channel: Record<string, any>;
}

export const MonthlyReportUniqueMSISDNSchema = SchemaFactory.createForClass(
  MonthlyReportUniqueMSISDN,
);
