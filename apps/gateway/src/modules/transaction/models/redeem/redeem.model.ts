import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Channel } from '@/channel/models/channel.model';

export type RedeemDocument = Redeem & Document;

@Schema({ collection: 'transaction_redeem' })
export class Redeem {
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
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  msisdn: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Origin',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
    default: 'redeem',
  })
  origin: string;

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
  tracing_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Status',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    enum: ['Processing', 'Success', 'Partial', 'Fail'],
    default: 'Processing',
  })
  status: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `
    keyword will refer to keyword
    configuration rule, the keyword can
    refer to redeem transaction,
    notification and confirmation with
    otp.
    Below possibility combination
    keyword value :
      - [keyword]
      - [keyword][delimiter][parameter]
      - [keyword_notif]
    `,
  })
  @IsString()
  @IsDefined()
  // @Matches(/^[a-z|A-Z|0-9]+[ ]*[0-9]*$/gm, {
  //   message:
  //     'Keyword should not be empty or with parameter ex: [keyword][space][number]',
  // })
  @Transform((e) => e.value.trimEnd())
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  keyword: string;

  @ApiProperty({
    required: false,
    example: 2,
    description: `Total coupon or point will be redeem. This only apply for flexible and fixed multiple point.`,
  })
  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  total_redeem: number;

  @ApiProperty({
    required: false,
    example: '',
    description: `
    Type of redeem based on redeem
    behaviour : </br>
    </br>
      a. general
      b. auction
    </br>
    if it’s empty, will set as general
    redeem process
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  redeem_type: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Value of adn with default value 777`,
  })
  @IsString()
  adn: string;

  @ApiProperty({
    required: false,
    example: false,
    description: `True or False, If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
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
    description: `Channel information from source application`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  channel_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Callback url from channel, if exists, then SL will call channel based on given url`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  callback_url: string;

  @ApiProperty({
    required: false,
    example: '{}',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  @Prop({
    type: Object,
    required: false,
  })
  additional_param: object;

  @Prop({
    type: SchemaTypes.Date,
  })
  transaction_date: Date;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  parent_master_id: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
  })
  merchant_id: string;

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

export const RedeemSchema = SchemaFactory.createForClass(Redeem);
