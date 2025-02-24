import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

import { ExampleJoin } from './example.join.model';
export type ExampleDocument = Example & Document;

@Schema()
export class Example {
  @ApiProperty({
    example: 'xxxxxx',
    minLength: 6,
    maxLength: 6,
    required: true, // Not neccessary. It will be always true if not defined
    description: 'Unique code',
  })
  @Prop({
    type: SchemaTypes.String,
    unique: true,
    minlength: 6,
    maxlength: 6,
    required: true,
  })
  @MaxLength(6)
  @MinLength(6)
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Naming example',
    description: 'For string input checker',
    minLength: 5,
  })
  @Prop({
    type: SchemaTypes.String,
    minlength: 5,
    required: true,
    default: 'Unnamed',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 10,
    description: 'For number input checker',
  })
  @Prop({ type: SchemaTypes.Number, default: 0 })
  @IsNotEmpty()
  @IsNumber()
  for_number: number;

  @ApiProperty({
    example: new Date().toISOString(),
    description: 'For date input checker',
  })
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  @IsDate()
  for_date: Date;

  @ApiProperty({
    type: ExampleJoin,
    description: 'Relation example',
  })
  @Prop({ type: Types.ObjectId, ref: ExampleJoin.name })
  @Type(() => ExampleJoin)
  @ValidateNested()
  example_join: ExampleJoin;

  @ApiProperty({
    type: ExampleJoin,
    isArray: true,
    description: 'Relation multiple join example',
  })
  @Prop({ type: Types.ObjectId, ref: ExampleJoin.name })
  @Type(() => ExampleJoin)
  @ValidateNested({ each: true })
  example_multi_join: ExampleJoin[];

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
    code?: string,
    name?: string,
    for_number?: number,
    for_date?: Date,
    example_join?: ExampleJoin,
    example_multi_join?: ExampleJoin[],
    created_by?: Account | null,
  ) {
    this.code = code;
    this.name = name;
    this.for_number = for_number;
    this.for_date = for_date;
    this.example_join = example_join;
    this.example_multi_join = example_multi_join;
    this.created_by = created_by;
  }
}

export const ExampleSchema = SchemaFactory.createForClass(Example);
