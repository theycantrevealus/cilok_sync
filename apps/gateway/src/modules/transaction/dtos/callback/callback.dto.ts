import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { Channel } from '@/channel/models/channel.model';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

import { ApiQueryTransaction } from '../transaction.property.dto';

export class CallbackDTO {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber Number',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `Original transaction id`,
  })
  @IsString()
  @IsNotEmpty()
  ref_transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: 'string',
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: Channel;

  @ApiProperty({
    required: false,
    type: 'number',
    example: 1,
    description: `Status of transaction</br>
    1 : Success</br>
    0 : Failed`,
  })
  @IsNumber()
  transaction_status: number;

  @ApiProperty({
    required: false,
    type: 'string',
    example: '',
    description: `Reason of failure if any`,
  })
  @IsString()
  remark: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  additional_param: string;
}

export class PostpaidCallbackQueryDTO {
  @ApiProperty(ApiQueryTransaction.msisdn)
  @IsNumberString()
  @IsNotEmpty()
  @MinLength(10)
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;

  @ApiProperty(ApiQueryTransaction.trxid)
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.trxid,
  })
  trxid: string;

  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.errormessage)
  @IsString()
  errormessage: string;

  @ApiProperty(ApiQueryTransaction.errorcode)
  @IsString()
  errorcode: string;

  @ApiProperty(ApiQueryTransaction.orderid)
  @IsString()
  orderid: string;

  @ApiProperty(ApiQueryTransaction.orderstatus)
  @IsString()
  orderstatus: string;
}
