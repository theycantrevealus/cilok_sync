import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

import { ExampleJoinv2 } from './example.join.v2';
export type Examplev2Document = Examplev2 & Document;

@Schema()
export class Examplev2 {
  @ApiProperty({
    example: 'xxxxxx',
    description: 'Unique code',
  })
  @MaxLength(6)
  @MinLength(6)
  @Prop({ type: SchemaTypes.String, unique: true, minlength: 6, maxlength: 6 })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Naming example',
    description: 'For string input checker',
    minLength: 5,
  })
  @Prop({ type: SchemaTypes.String, minlength: 5 })
  @IsString()
  name: string;

  @ApiProperty({
    example: 10,
    description: 'For number input checker',
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  for_number: number;

  @ApiProperty({
    example: new Date().toISOString(),
    description: 'For date input checker',
  })
  @IsDate()
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  for_date: Date;

  @ApiProperty({
    type: ExampleJoinv2,
    isArray: true,
    description: 'For date input checker',
  })
  @IsArray() // No prop here because it need only for parameter only. Split model add. It will handle at service section
  example_join_v2: ExampleJoinv2[];

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  created_by: Account | null;

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
    code?: string,
    name?: string,
    for_number?: number,
    for_date?: Date,
    created_by?: Account | null,
  ) {
    this.code = code;
    this.name = name;
    this.for_number = for_number;
    this.for_date = for_date;
    this.created_by = created_by;
  }
}

export const Examplev2Schema = SchemaFactory.createForClass(Examplev2);
