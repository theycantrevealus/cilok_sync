import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type VerificationVoucherDocument = VerificationVoucher & Document;

@Schema({ collection: 'transaction_verification_voucher' })
export class VerificationVoucher {
  @ApiProperty({
    required: false,
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  locale: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Subscriber Number',
  })
  @IsNumberString()
  // @Matches(/^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/, {
  //   message: 'Invalid MSISDN format',
  // })
  // @MinLength(10)
  @Prop({ type: SchemaTypes.String, required: false, index: true })
  msisdn: string;

  @ApiProperty({
    type: String,
    example: '',
    description: `Keyword Verification for redeemed voucher, refer to program and keyword configuration`,
  })
  @IsString()
  // @IsNotEmpty()
  // @IsDefined({
  //   message: TransactionErrorMsgResp.required.keyword_verification,
  // })
  @Prop({ type: SchemaTypes.String })
  keyword_verification: string;

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

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  master_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: '',
  })
  voucher_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Keyword Bonus, Redeem once verification success`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword_bonus: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Given Voucher Code, If Exists`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  voucher_code: string;

  @ApiProperty({
    required: false,
    type: Boolean,
    example: false,
    description: `True or False, If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, required: false })
  send_notification: boolean;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Channel transaction if exists`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  channel_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  additional_param: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  created_by: Account;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Outlet Code`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  outlet_code: string;

  constructor(
    locale?: string,
    msisdn?: string,
    keyword_verification?: string,
    merchant_id?: string,
    keyword_bonus?: string,
    voucher_code?: string,
    send_notification?: boolean,
    transaction_id?: string,
    channel_id?: string,
    additional_param?: string,
    created_by?: Account | null,
  ) {
    this.locale = locale;
    this.msisdn = msisdn;
    this.keyword_verification = keyword_verification;
    this.merchant_id = merchant_id;
    this.keyword_bonus = keyword_bonus;
    this.voucher_code = voucher_code;
    this.send_notification = send_notification;
    this.transaction_id = transaction_id;
    this.channel_id = channel_id;
    this.additional_param = additional_param;
    this.created_by = created_by;
  }
}

export const VerificationVoucherSchema =
  SchemaFactory.createForClass(VerificationVoucher);
