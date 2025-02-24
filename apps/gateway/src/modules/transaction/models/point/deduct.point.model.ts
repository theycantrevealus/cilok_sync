import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsNegative,
  IsNotEmpty,
  IsNumber,
  isNumber,
  IsNumberString,
  IsObject,
  IsPositive,
  isPositive,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Document, Mixed, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type DeductPointDocument = DeductPoint & Document;

@Schema({ collection: 'transaction_deduct_poin' })
export class DeductPoint {
  @ApiProperty({
    required: false,
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, default: 'id-ID' })
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    type: String,
    description: 'Subscriber Number. Format : 68xxxxxx / 11xxxxxx',
  })
  @IsNumberString()
  @IsNotEmpty()
  @MinLength(10)
  @Prop({ type: SchemaTypes.String, required: true })
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  @Matches(/^(62811|62812|62813|62821|62822|62823|62851|62852|62853|01|1)+[0-9]+$/, {
    message: 'Invalid MSISDN format',
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
  @Prop({ type: SchemaTypes.String })
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
  @Prop({ type: SchemaTypes.String })
  @Matches(/^[a-zA-Z0-9]+( [0-9]+)?$/, {
    message: TransactionErrorMsgResp.matches.keyword,
  })
  @Transform((e) => e.value.trimEnd())
  keyword: string;

  @ApiProperty({
    required: false,
    type: Number,
    example: 1,
    minimum: 1,
    description:
      'Total point to be injected, this parameter will be used if keyword apply flexible methode',
  })
  // @IsNegative()
  @IsPositive()
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  total_point: number;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `True or False, <br />
      If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @Prop({ type: SchemaTypes.Boolean })
  @IsBoolean()
  send_notification: boolean;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Channel transaction if exists ',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: 'Channel information from source application',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  channel_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description:
      'Callback url from channel, if exists, then SL will call channel based on given url',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  callback_url: string;

  @ApiProperty({
    required: false,
    type: Object,
    example: '',
    description:
      'Additional parameter if needed, with format : { "code": "X", "name": "Y" }',
  })
  @IsObject()
  additional_param: object;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: '',
  })
  master_id: Mixed;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: '',
  })
  tracing_id: Mixed;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  parent_master_id: string;

  @Prop({
    type: SchemaTypes.Date,
  })
  transaction_date: Date;

  @Prop({
    type: SchemaTypes.String,
  })
  create_local_time: string;

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

  @Prop({ type: SchemaTypes.Mixed, required: false })
  responseBody: object;
}

export const DeductPointSchema = SchemaFactory.createForClass(DeductPoint);
