import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsAlpha,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type PICDocument = PIC & Document;

@Schema()
export class PIC {
  @ApiProperty({
    example: 'TELKOMSEL REWARD',
    minLength: 6,
    required: true, // Not neccessary. It will be always true if not defined
    description: 'Name PIC Example',
  })
  @Prop({
    type: SchemaTypes.String,
    unique: true,
    minlength: 6,
    required: true,
  })
  @MinLength(6)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z ]*$/,{
    message: 'Name Only alphabet accepted for this field'
  })
  name: string;

  @ApiProperty({
    example: '6282284395802',
    minLength: 11,
    maxLength: 14,
    required: true, // Not neccessary. It will be always true if not defined
    description: 'MSISDN PIC Example',
  })
  @Prop({
    type: SchemaTypes.String,
    unique: true,
    minlength: 11,
    maxlength: 14,
    required: true,
  })
  @MinLength(11)
  @MaxLength(14)
  @IsNotEmpty()
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: 'telkomsel@tsel.com',
    minLength: 8,
    required: true, // Not neccessary. It will be always true if not defined
    description: 'Email PIC Example',
  })
  @Prop({
    type: SchemaTypes.String,
    unique: true,
    minlength: 8,
    required: true,
  })
  @MinLength(8)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: true,
  })
  @Type(() => Account)
  created_by: Account | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    name?: string,
    msisdn?: string,
    email?: string,
    created_by?: Account | null,
  ) {
    this.name = name;
    this.msisdn = msisdn;
    this.email = email;
    this.created_by = created_by;
  }
}

export const PICSchema = SchemaFactory.createForClass(PIC);
