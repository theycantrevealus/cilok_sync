import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
} from 'class-validator';
import {Document, SchemaTypes, Types} from 'mongoose';

const moment = require('moment-timezone');
import {TimeManagement} from '@/application/utils/Time/timezone';

export type CouponGenerateUniqueMsisdnDocument = CouponGenerateUniqueMsisdn & Document;

@Schema({collection: 'report_coupon_generate_unique_msisdn_daily'})
export class CouponGenerateUniqueMsisdn {

  @ApiProperty({
    description: 'Total coupon per transaction from start period until report date-hour',
    type: Number,
  })
  @Prop({type: SchemaTypes.Number})
  @IsNumber()
  total_coupon;

  @ApiProperty({
    description: 'Total MSISD per transaction from start period until report date-hour',
    type: Number,
  })
  @Prop({type: SchemaTypes.Number})
  @IsNumber()
  total_msisdn;

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  created_at: Date;

  @ApiProperty({
    description: 'All Keywords related to report’s Parent Program',
    type: String,
  })
  @IsString()
  @Prop({type: SchemaTypes.String})
  program_name: string;

  @Prop({type: SchemaTypes.Mixed, default: null})
  start_period: Date | null;

  @Prop({type: SchemaTypes.Mixed, default: null})
  end_period: Date | null;

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  updated_at: Date;

  @Prop({type: SchemaTypes.Mixed, default: null})
  deleted_at: Date | null;
}

export const CouponGenerateUniqueMsisdnSchema = SchemaFactory.createForClass(CouponGenerateUniqueMsisdn);
