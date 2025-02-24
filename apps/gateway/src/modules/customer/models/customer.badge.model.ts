import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type CustomerBadgeDocument = CustomerBadge & Document;

@Schema()
export class CustomerBadge {
  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

  @Prop({ type: SchemaTypes.String })
  experience_name: string;

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

  constructor(name?: string, description?: string, experience_name?: string) {
    this.name = name;
    this.description = description;
    this.experience_name = experience_name;
  }
}

export const CustomerBadgeSchema = SchemaFactory.createForClass(CustomerBadge);
