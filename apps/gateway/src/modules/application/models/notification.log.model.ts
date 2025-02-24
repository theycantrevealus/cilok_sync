import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class NotificationLog {
  @Prop({ type: SchemaTypes.String, required: false })
  tracing_id: string;

  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @Prop({ type: SchemaTypes.String, index: true })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  via: string;

  @Prop({ type: Object })
  request: object;

  @Prop({ type: Object })
  response: object;

  @Prop({ type: SchemaTypes.Boolean })
  is_send: boolean;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);
