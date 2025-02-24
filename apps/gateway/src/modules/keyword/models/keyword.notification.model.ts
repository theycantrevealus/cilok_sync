import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsString } from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '../../lov/models/lov.model';
import { Keyword } from './keyword.model';
export type KeywordNotificationDocument = KeywordNotification & Document;

@Schema()
export class KeywordNotification {
  @ApiProperty({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    required: true,
    description: `Required, Not Empty, ID of keyword`,
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  })
  @Type(() => Keyword)
  keyword: Keyword;

  @ApiProperty({
    example: '62ffdb621e38fbdeb16f1f5d',
    description: 'Reference ke enpoint /v1/lov/bonus_type',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  bonus_type_id: string;

  @ApiProperty({
    example: 'JANOL2022',
    description: '',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  keyword_name: string;

  @ApiProperty({
    example: 'JANOL2022',
    description: 'Could be keyword oid',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  code_identifier: string;

  @ApiProperty({
    example: 'Notification Template',
    description:
      'Notification template content loaded from selected notification template',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  notification_content: string;

  @ApiProperty({
    example: new Date().toISOString(),
    description:
      'Start Period. If not set. will follow eligibility start period',
  })
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  @IsDate()
  start_period: Date;

  @ApiProperty({
    example: new Date().toISOString(),
    description: 'End Period. If not set. will follow eligibility end period',
  })
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  @IsDate()
  end_period: Date;

  @ApiProperty({
    example: '',
    description: 'From LOV',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  notif_type: string;

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
    description: 'Notification Type',
  })
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  via: string[];

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['6302488d53b5ef1a0e17457b', '6302489253b5ef1a0e174589'],
    description: 'Reciver',
  })
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  receiver: string[];

  constructor(via?: string[], receiver?: string[]) {
    this.via = via;
    this.receiver = receiver;
  }
}

export const KeywordNotificationSchema =
  SchemaFactory.createForClass(KeywordNotification);
