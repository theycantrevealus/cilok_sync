import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type ProgramGroupDocument = ProgramGroup & Document;

@Schema()
export class ProgramGroup {
  @Prop({ type: SchemaTypes.String })
  group_name: string;

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

  constructor(group_name?: string) {
    this.group_name = group_name;
  }
}

export const ProgramGroupSchema = SchemaFactory.createForClass(ProgramGroup);
