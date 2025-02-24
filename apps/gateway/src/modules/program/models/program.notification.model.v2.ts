import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString } from 'class-validator';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Lov } from '../../lov/models/lov.model';
import { NotificationTemplate } from '../../notification/models/notification.model';
import { Program } from './program.model';
export type ProgramNotificationDocument = ProgramNotification & Document;

@Schema()
export class ProgramNotification {
  @ApiProperty({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    required: true,
    description: `Required, Not Empty, ID of program`,
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Program.name,
    required: false,
  })
  @Type(() => Program)
  program: Program;

  // @ApiProperty({
  //   type: mongoose.Schema.Types.ObjectId,
  //   example: '62ffbdd1745271e7ba71e848',
  //   required: true,
  //   description: `Required, Not Empty, ID of LOV`,
  // })
  // @Prop({ 
  //   type: mongoose.Schema.Types.ObjectId, 
  //   ref: Lov.name 
  // })
  // @Type(() => Lov)
  // @IsString()
  // via: Lov;

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

  @ApiProperty({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    required: false,
    description: `Required, Not Empty, ID of LOV`,
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    ref: Lov.name
  })
  @Type(() => Lov)
  @IsString()
  notif_type: Lov;

  @ApiProperty({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    required: false,
    description: `Required, Not Empty, ID of Notification Template`,
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    example: '62ffbdd1745271e7ba71e848',
    ref: NotificationTemplate.name,
  })
  @Type(() => NotificationTemplate)
  @IsString()
  template: NotificationTemplate;

  @ApiProperty({
    required: false,
    example: 'Example of program threshold alarm expired',
    description: `Load notification content from selected <b>template</b>. Customizable content notification template`,
  })
  @Prop({
    type: SchemaTypes.String,
    example: 'Example of program threshold alarm expired',
    description: `Load notification content from selected <b>template</b>. Customizable content notification template`,
  })
  @IsString()
  template_content: string;

  constructor(
    program?: Program,
    via?: string[],
    receiver?: string[],
    notif_type?: Lov,
    template?: NotificationTemplate,
    template_content?: string,
  ) {
    this.program = program;
    this.via = via;
    this.receiver = receiver;
    this.notif_type = notif_type;
    this.template = template;
    this.template_content = template_content;
  }
}

export const ProgramNotificationSchema =
  SchemaFactory.createForClass(ProgramNotification);
