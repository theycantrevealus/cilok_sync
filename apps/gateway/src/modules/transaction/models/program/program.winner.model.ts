import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsString,
  MinLength,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type ProgramWinnerDocument = ProgramWinner & Document;

@Schema({ collection: 'transaction_program_winner' })
export class ProgramWinner {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    default: 'id-ID',
    required: false,
  })
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber number',
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
    required: true,
    example: '',
    description: 'Auction Keyword',
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    required: true,
    type: SchemaTypes.String,
  })
  keyword: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Natioanl Registration ID',
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  nik: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Subscriber Name',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Email address',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  email: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Province',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  province: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Kabupaten',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  district: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Kecamatan',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  sub_district: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Postal Code',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  postal_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Address',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  address: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: 'string',
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
    example: { code: 'X', name: 'Y' },
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsObject()
  @Prop({
    type: Object,
    required: false,
  })
  additional_param: object;

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

export const ProgramWinnerSchema = SchemaFactory.createForClass(ProgramWinner);
