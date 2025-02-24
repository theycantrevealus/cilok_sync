import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
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

export type InjectWhitelistDocument = InjectWhitelist & Document;

@Schema({ collection: 'transaction_inject_whitelist' })
export class InjectWhitelist {
  @ApiProperty({
    required: false,
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, default: 'id-ID', required: false })
  locale: string;

  @ApiProperty({
    required: true,
    type: String,
    example: '',
    description: 'Customer MSISDN. Format : 628xxxxxx',
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
    example: '',
    description: 'Telkomsel ID',
  })
  @IsString()
  tsel_id?: string;

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
  @Matches(/^[a-z|A-Z|0-9]+[ ]*[0-9]*$/gm, {
    message: TransactionErrorMsgResp.matches.keyword,
  })
  @Transform((e) => {
    return e.value ? e.value.trimEnd() : '';
  })
  keyword: string;

  @ApiProperty({
    required: false,
    type: Boolean,
    example: false,
    description: `With counter`,
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, required: false })
  with_counter: boolean;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Channel transaction id`,
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

  constructor(
    locale?: string,
    msisdn?: string,
    program_id?: string,
    keyword?: string,
    transaction_id?: string,
    channel_id?: string,
    additional_param?: string,
    created_by?: Account | null,
  ) {
    this.locale = locale;
    this.msisdn = msisdn;
    this.program_id = program_id;
    this.keyword = keyword;
    this.transaction_id = transaction_id;
    this.channel_id = channel_id;
    this.additional_param = additional_param;
    this.created_by = created_by;
  }
}

export const InjectWhitelistSchema =
  SchemaFactory.createForClass(InjectWhitelist);
