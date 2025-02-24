import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type RefundPointDocument = RefundPoint & Document;

@Schema({ collection: 'transaction_refund_poin' })
export class RefundPoint {
  @ApiProperty({
    required: false,
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String, default: 'id-ID' })
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
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  @Prop({ type: SchemaTypes.String, required: true })
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
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  remark: string;

  @ApiProperty({
    required: true,
    type: String,
    example: '',
    description:
      'Ref_transaction_id must come from channel and must match with recorded transaction </br> Transaction id must refer to trace_id in previous deduct transaction api response.',
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.ref_transaction_id,
  })
  @Prop({ type: SchemaTypes.String, required: true })
  ref_transaction_id: string;

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
    // type: String,
    example: '',
    description:
      'Additional parameter if needed, with format : { "code": "X", "name": "Y" }',
  })
  // @IsString()
  @Prop({ type: SchemaTypes.Mixed })
  additional_param: any;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  created_by: Account;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.String,
  })
  create_local_time: string;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @Prop({ type: SchemaTypes.Mixed, min: 0, required: false })
  responseBody: object;
}

export const RefundPointSchema = SchemaFactory.createForClass(RefundPoint);
