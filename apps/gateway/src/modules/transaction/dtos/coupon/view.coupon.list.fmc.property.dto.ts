import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import { ApiQueryTransaction } from '@/transaction/dtos/transaction.property.dto';

import { FmcIdenfitiferType } from '../point/fmc.member.identifier.type';

export class ViewCouponFMCParamDTO {
  @ApiProperty({
    required: true,
    example: '',
    description: 'MSISDN / Indihome Number / TSEL ID',
  })
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class ViewCouponFMCQueryDTO {
  @ApiProperty(ApiQueryTransaction.identifier)
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  identifier: FmcIdenfitiferType;

  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.limit)
  @IsNumberString()
  limit: number;

  @ApiProperty(ApiQueryTransaction.skip)
  @IsNumberString()
  skip: number;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;

  @ApiProperty({
    required: false,
    description: 'Program ID',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  program_id: string;

  @ApiProperty({
    required: false,
    description: 'Keyword',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  keyword: string;

  @ApiProperty({
    required: false,
    description: 'Period Time, ex. Period 1, 2 etc. ( used for MBP )',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  period: string;
}
