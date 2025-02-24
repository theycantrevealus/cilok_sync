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

import { FmcIdenfitiferType } from './fmc.member.identifier.type';

// View Point History
export class ViewPointHistoryFMCParamDTO {
  @ApiProperty({
    required: true,
    example: '08555555555',
    description: 'MSISDN / Indihome Number / TSEL ID',
  })
  // @MinLength(10)
  // @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class ViewPointHistoryFMCQueryDTO {
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

  @ApiProperty(ApiQueryTransaction.from)
  @IsString()
  @Matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/, {
    message: TransactionErrorMsgResp.matches.from,
  })
  from: string;

  @ApiProperty(ApiQueryTransaction.to)
  @IsString()
  @Matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/, {
    message: TransactionErrorMsgResp.matches.to,
  })
  to: string;

  @ApiProperty(ApiQueryTransaction.type)
  @IsString()
  // @IsNotEmpty()
  // @IsDefined({
  //   message: TransactionErrorMsgResp.required.type,
  // })
  type: string;

  @ApiProperty(ApiQueryTransaction.bucket_type)
  @IsString()
  bucket_type: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}
