import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsBoolean } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';
export type InjectPointModelDocument = InjectPointModel & Document;

@Schema()
export class InjectPointModel {
  @Prop({ type: SchemaTypes.String })
  locale: string;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  program_id: string;

  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @Prop({ type: SchemaTypes.Boolean })
  @IsBoolean()
  send_notification: boolean;
}

export const InjectPointModelSchema =
  SchemaFactory.createForClass(InjectPointModel);
