import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

export type KeywordPriorityDocument = KeywordPriority & Document;

@Schema()
export class KeywordPriority {
  @ApiProperty({
    example: 'POIN',
    description: 'Keyword Name',
  })
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  keyword: string;

  @ApiProperty({
    example: 'High',
    description: 'Keyword Priority, Low, Default, or High',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  priority: string;

  @ApiProperty({
    example: '2022-01-01',
    description: 'Start Date',
  })
  @IsString()
  @Prop({ type: SchemaTypes.Date })
  start: Date;

  @ApiProperty({
    example: '2022-12-21',
    description: 'End Date',
  })
  @IsString()
  @Prop({ type: SchemaTypes.Date })
  end: Date;
}

export const KeywordPrioritySchema =
  SchemaFactory.createForClass(KeywordPriority);
