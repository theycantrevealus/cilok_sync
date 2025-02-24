import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import { SchemaTypes } from 'mongoose';
import { Prop } from '@nestjs/mongoose';

export class VoucherListParamDTO {
  @ApiProperty({
    name: 'msisdn',
    type: String,
    required: true,
    description: `Subscriber number`,
  })
  @IsNotEmpty()
  @Matches(/^(0|62)(81|82|83|85)+[0-9]+$/, {
    message: 'Invalid MSISDN format',
  })
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  @MinLength(10)
  @IsNumberString()
  msisdn: string;
}

export class VoucherListQueryDTO {
  @ApiProperty({
    required: false,
    default: 5,
    description: 'Limit record, default is last 5 records ( configurable )',
  })
  @IsNumberString()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  limit: number;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Offset data, will start record after specified value.',
  })
  @IsNumberString()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  skip: number;

  @ApiProperty({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
      { "code": "X", "name": "Y" }
      `,
  })
  @Matches(/^(\{.*\}|\[.*\])$/, { message: 'Filter should be a valid JSON string' })
  filter: string;

  @ApiProperty({
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
      { "code": "X", "name": "Y" }
      `,
  })
  @IsString()
  additional_param: string;
}
