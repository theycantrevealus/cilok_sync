import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

const moment = require('moment-timezone');

export class CreateCouponSummaryDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
  keyword_id: string;

  @ApiProperty()
  @IsNotEmpty()
  keyword_name: string;

  @ApiProperty()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => moment(value))
  program_end: Date;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => new Types.ObjectId(value))
  program_id: string;

  @ApiProperty()
  @IsNotEmpty()
  program_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => moment(value))
  program_start: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  total_coupon: number;

  @ApiProperty()
  @IsOptional()
  synced_at: Date;
}
