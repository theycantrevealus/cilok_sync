import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type CheckRedeemDocument = CheckRedeem & Document;

@Schema({ collection: 'check_redeem' })
export class CheckRedeem {
  // @IsNotEmpty()
  @IsString()
  @Prop({
    required: false,
    type: SchemaTypes.String,
  })
  msisdn: string;

  @ApiProperty({
    required: true,
    example: 'PRG001',
  })
  @IsNotEmpty()
  @IsString()
  @Prop({
    required: true,
    type: SchemaTypes.String,
  })
  program: string;

  @ApiProperty({
    required: true,
    example: 'KEY001',
  })
  @IsString()
  @Prop({
    required: false,
    type: SchemaTypes.String,
  })
  keyword: string;

  @ApiProperty({
    required: true,
    example: 'Day',
  })
  @IsNotEmpty()
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  max_mode: string;

  @ApiProperty({
    required: false,
    example: new Date(),
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  from: Date;

  @ApiProperty({
    required: false,
    example: new Date(),
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  to: Date;

  @ApiProperty({
    required: true,
    example: '1',
  })
  @IsNumber()
  @IsPositive()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
  })
  counter: number;

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

  __v?: number;
}

export const CheckRedeemSchema = SchemaFactory.createForClass(CheckRedeem);
