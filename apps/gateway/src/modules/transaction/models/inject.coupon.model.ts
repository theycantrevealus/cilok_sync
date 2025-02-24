import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type InjectCouponDocument = InjectCoupon & Document;

@Schema({ collection: 'transaction_inject_coupon' })
export class InjectCoupon {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber Number',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  @Matches(
    /^(62811|62812|62813|62821|62822|62823|62851|62852|62853|01|1)+[0-9]+$/,
    {
      message: 'Invalid MSISDN format',
    },
  )
  @Prop({
    type: SchemaTypes.String,
    required: true,
    index: true,
  })
  msisdn: string;

  @ApiProperty({
    type: String,
    example: '',
    description: 'Program Id ( Need one of parameter Program Id or Keyword )',
    required: false,
  })
  @ValidateIf((o) => o.keyword == '' || !o.keyword)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.program_id,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  program_id: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  program_name: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  program_start: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  program_end: string;

  @ApiProperty({
    type: String,
    example: '',
    description:
      'Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )',
  })
  @ValidateIf((o) => o.program_id == '' || !o.program_id)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.keyword,
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @ApiProperty({
    required: false,
    description: 'Total Coupon Will Be Redeemed',
  })
  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  total_coupon: number;

  // @IsNumber()
  // total_redeem?: number;

  // @IsNumber()
  // total_point?: number;

  @ApiProperty({
    required: false,
    example: false,
    description: `True or False<br>
    If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean,
    required: false,
  })
  send_notification: boolean;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction if exists`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Transaction id`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  parent_transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel information from source application.<br>
    Reference to List Channel From Legacy for Program Creation.
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  channel_id: string;

  @ApiProperty({
    type: String,
    example: '',
    description:
      'Callback url from channel, if exists, then SL will call channel based on given url',
    required: false,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  callback_url: string;

  // @ApiProperty({
  //   required: false,
  //   example: '{}',
  //   description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  // })
  // @IsString()
  // @Prop({
  //   type: String,
  //   required: false,
  // })
  // additional_param: string;

  @ApiProperty({
    required: false,
    example: '{}',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsObject()
  @Prop({
    type: Object,
    required: false,
  })
  additional_param: object;

  @Prop({
    type: String,
    default: '',
  })
  core_id: string;

  @Prop({
    type: String,
    default: '',
  })
  core_type: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_serial_code: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_name: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_desc: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_remark: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_product_name: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_owner_name: string;

  // @Prop({
  //   type: String,
  //   default: '',
  // })
  // core_owner_phone: string;

  // @Prop({
  //   type: Boolean,
  //   default: false, // TODO
  // })
  // core_provider_flag: boolean;

  // @Prop({
  //   type: Boolean,
  //   default: false, // TODO
  // })
  // core_merchant_flag: boolean;

  @Prop({
    type: String,
    default: '',
  })
  core_start_time: string;

  @Prop({
    type: String,
    default: '',
  })
  core_end_time: string;

  @Prop({
    type: String,
    default: '',
  })
  core_status: string;

  @Prop({
    type: String,
    default: '',
  })
  core_redeem_time: string;

  @Prop({
    type: Number,
    default: 0,
  })
  core__v: number;

  @Prop({
    type: String,
    default: '',
  })
  core_time: string;

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
}

export const InjectCouponSchema = SchemaFactory.createForClass(InjectCoupon);
