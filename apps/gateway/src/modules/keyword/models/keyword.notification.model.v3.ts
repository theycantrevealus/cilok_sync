import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '../../lov/models/lov.model';
import { KeywordPopulate } from './keyword.populate.model';
export type KeywordNotificationv3Document = KeywordNotificationv3 & Document;

@Schema()
export class KeywordNotificationv3 {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

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
    enum: ['sms', 'email', 'both'],
    example: 'sms',
    description: 'Notification Type',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  via: string;

  constructor(keyword?: KeywordPopulate, via?: string) {
    this.keyword = keyword;
    this.via = via;
  }
}

export const KeywordNotificationv3Schema = SchemaFactory.createForClass(
  KeywordNotificationv3,
);
