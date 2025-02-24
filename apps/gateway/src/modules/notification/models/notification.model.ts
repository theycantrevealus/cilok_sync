import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '@/lov/models/lov.model';
import { Channel } from '@/channel/models/channel.model';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
export type NotificationTemplateDocument = NotificationTemplate & Document;

@Schema()
export class NotificationTemplate {
  @Prop({type: SchemaTypes.String, unique: true,required:true})
  code: string

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  notif_type: Lov;

  @Prop({ type: SchemaTypes.String })
  notif_name: string;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  notif_via: Lov[];

  @Prop({ type: SchemaTypes.String })
  notif_content: string;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  receiver: Lov[];

  @Type(() => Channel)
  @Prop({ type: [{ type: Types.ObjectId, ref: Channel.name }] })
  channel_id: Channel[];

  @Prop({ type: SchemaTypes.Array })
  @IsArray()
  variable: string[];

  constructor(
    notif_name?: string,
    notif_type?: Lov,
    notif_via?: Lov[],
    notif_content?: string,
    receiver?: Lov[],
    channel_id?: Channel[],
    variable?: string[],
  ) {
    this.notif_name = notif_name;
    this.notif_type = notif_type;
    this.notif_via = notif_via;
    this.notif_content = notif_content;
    this.receiver = receiver;
    this.channel_id = channel_id;
    this.variable = variable;
  }
}

export const NotificationTemplateSchema =
  SchemaFactory.createForClass(NotificationTemplate);
