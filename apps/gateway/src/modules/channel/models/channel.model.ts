import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
export type ChannelDocument = Channel & Document;

@Schema()
export class Channel {
  toUpperCase(): any {
    return false;
  }
  @Prop({ type: SchemaTypes.String })
  code: string;

  @Prop({ type: SchemaTypes.String })
  ip: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

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

  constructor(code?: string, ip?: string, name?: string, description?: string) {
    this.code = code;
    this.ip = ip;
    this.name = name;
    this.description = description;
  }
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
