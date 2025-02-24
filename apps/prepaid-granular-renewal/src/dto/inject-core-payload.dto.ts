import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { EventCodeEnum } from '../enum/event-code.enum';

export class InjectCorePayloadDto {
  @IsNotEmpty()
  @IsString()
  locale = 'en-US';

  @IsNotEmpty()
  @IsString()
  @IsEnum(EventCodeEnum)
  event_code: string | EventCodeEnum;

  @IsNotEmpty()
  @IsString()
  transaction_no: string;

  @IsNotEmpty()
  @IsString()
  channel = 'R1';

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  revenue: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  point: number;

  @IsOptional()
  @Type(() => Number)
  sp_multiplier: number | null;

  @IsNotEmpty()
  @IsString()
  msisdn: string;

  @IsNotEmpty()
  @IsString()
  package_name: string;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  business_id: string;

  @IsNotEmpty()
  @IsBoolean()
  default_earning: boolean;
}
