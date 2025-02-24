import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '@/lov/models/lov.model';
import { NotificationTemplate } from '@/notification/models/notification.model';
import { Program } from '@/program/models/program.model';
export type ProgramNotificationDocument = ProgramNotification & Document;

@Schema()
export class ProgramNotification {
  @Prop({
    type: Types.ObjectId,
    ref: Program.name,
    required: false,
  })
  @Type(() => Program)
  program: Program;

  @Prop({
    type: Types.ObjectId,
    ref: NotificationTemplate.name,
  })
  @Type(() => NotificationTemplate)
  notification: NotificationTemplate;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  via: Lov;

  @Prop({ type: SchemaTypes.Array })
  receiver: string[];

  constructor(
    program?: Program,
    via?: Lov,
    receiver?: string[],
    notificaton?: NotificationTemplate,
  ) {
    this.program = program;
    this.via = via;
    this.receiver = receiver;
    this.notification = notificaton;
  }
}

export const ProgramNotificationSchema =
  SchemaFactory.createForClass(ProgramNotification);
