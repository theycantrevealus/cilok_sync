import { SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Document } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type FMCInjectPointDocument = FMCInjectPoint & Document;

export class FMCInjectPoint {
  @ApiProperty({
    required: false,
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    type: String,
    description: 'Subscriber Number. Format : 68xxxxxx',
  })
  @IsNumberString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(12)
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Program Id ( Need one of parameter Program Id or Keyword )',
  })
  @ValidateIf((o) => o.keyword == '' || !o.keyword)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.program_id,
  })
  @IsNotEmpty()
  @IsString()
  program_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description:
      'Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )',
  })
  @ValidateIf((o) => o.program_id == '' || !o.program_id)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.keyword,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+( [0-9]+)?$/, {
    message: TransactionErrorMsgResp.matches.keyword,
  })
  @Transform((e) => e.value.trimEnd())
  keyword: string;

  @ApiProperty({
    required: false,
    type: Number,
    description:
      'Total point to be injected, this parameter will be used if keyword apply flexible methode',
  })
  @IsNumber()
  @IsOptional()
  total_point: number;

  @ApiProperty({
    required: false,
    type: Boolean,
    example: false,
    description: `True or False, <br />
      If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  send_notification: boolean;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Channel transaction if exists ',
  })
  @IsString()
  @Matches(/^\S*$/)
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Channel information from source application',
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description:
      'Callback url from channel, if exists, then SL will call channel based on given url',
  })
  @IsString()
  //   @IsNotEmpty()
  callback_url: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description:
      'Additional parameter if needed, with format : { "code": "X", "name": "Y" }',
  })
  @IsString()
  //   @IsNotEmpty()
  additional_param: any;

  created_by: Account;

  created_at: Date;

  updated_at: Date;

  deleted_at: Date | null;

  responseBody: object;
}

export const FMCInjectPointSchema =
  SchemaFactory.createForClass(FMCInjectPoint);
