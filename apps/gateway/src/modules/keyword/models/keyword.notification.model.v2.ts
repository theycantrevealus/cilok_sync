import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '../../lov/models/lov.model';
import { NotificationTemplate } from '../../notification/models/notification.model';
import { KeywordPopulate } from './keyword.populate.model';
export type KeywordNotificationV2Document = KeywordNotificationV2 & Document;

@Schema()
export class KeywordNotificationV2 {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({
    type: Types.ObjectId,
    ref: NotificationTemplate.name,
  })
  @Type(() => NotificationTemplate)
  notification: NotificationTemplate;

  @ApiProperty({
    example: 'Notification Template',
    description:
      'Notification template content loaded from selected notification template',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  notification_content: string;

  @ApiProperty({
    example: 'Notification Type',
    description: 'Notification Type',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  notif_type: string;

  @ApiProperty({
    example: 'Notification Type',
    description:
      'Notification type content loaded from selected notification template',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  transaction_type: string;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  via: Lov;

  constructor(
    keyword?: KeywordPopulate,
    via?: Lov,
    receiver?: Lov,
    notificaton?: NotificationTemplate,
  ) {
    this.keyword = keyword;
    this.via = via;
    // this.receiver = receiver;
    this.notification = notificaton;
  }
}

export const KeywordNotificationV2Schema = SchemaFactory.createForClass(
  KeywordNotificationV2,
);
