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

import { FmcIdenfitiferType } from '../point/fmc.member.identifier.type';
import { ApiQueryTransaction } from '../transaction.property.dto';

export class VoucherListFMCParamDTO {
  @ApiProperty({
    required: true,
    example: '08555555555',
    description: 'MSISDN / Indihome Number / TSEL ID',
  })
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class VoucherListFMCQueryDTO {
  @ApiProperty(ApiQueryTransaction.identifier)
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  identifier: FmcIdenfitiferType;

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

  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;
}
