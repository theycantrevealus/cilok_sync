import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { Channel } from '@/channel/models/channel.model';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import { KeywordBonus } from '@/keyword/models/keyword.bonus.model';
import { Merchant } from '@/merchant/models/merchant.model';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import { ApiQueryTransaction } from '@/transaction/dtos/transaction.property.dto';

export class VerificationVoucherDTO {
  @ApiProperty({
    required: false,
    example: 'id-ID',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'MSISDN / Indihome Number / TSEL ID',
  })
  // @MinLength(10)
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Merchant Id`,
  })
  @IsString()
  // @IsNotEmpty()
  // @IsDefined({
  //   message: TransactionErrorMsgResp.required.merchant_id,
  // })
  @Prop({ type: SchemaTypes.String, required: false })
  merchant_id: string;

  @ApiProperty(ApiQueryTransaction.identifier)
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.identifier,
  })
  identifier: FmcIdenfitiferType;

  @ApiProperty({
    required: true,
    example: '',
    description: `Keyword Verification for redeemed voucher, refer to program and keyword configuration`,
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.keyword_verification,
  })
  keyword_verification: string;

  @ApiProperty({
    required: false,
    example: '',
    type: String,
    description: `Outlet Code`,
  })
  @IsString({ message: 'Must be string' })
  @Prop({ type: SchemaTypes.String, required: false })
  outlet_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  master_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  voucher_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Keyword Bonus, Redeem once verification success`,
  })
  @IsString()
  keyword_bonus: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Given Voucher Code, If Exists`,
  })
  @IsString()
  voucher_code: string;

  @ApiProperty({
    required: false,
    example: false,
    description: `True or False, If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  send_notification: boolean;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction if exists`,
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
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  additional_param: string;
}

@Injectable()
export class VoucherVerifValidate implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (
      (!value.msisdn && !value.voucher_code) ||
      (value.msisdn === '' && value.voucher_code === '')
    )
      throw new BadRequestException('msisdn or voucher_code must be defined');
    else return value;
  }
}
