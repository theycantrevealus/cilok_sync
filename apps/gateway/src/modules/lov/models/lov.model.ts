import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
export type LovDocument = Lov & Document;

@Schema()
export class Lov {
  @Prop({ type: SchemaTypes.String })
  group_name: string;

  @Prop({ type: SchemaTypes.String, unique: true })
  set_value: any;

  @Prop({ type: SchemaTypes.String })
  description: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  additional: object | any;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  created_by: any | null;

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

  constructor(
    group_name?: string,
    set_value?: string,
    description?: string,
    additional?: object | any,
    created_by?: Account | null,
  ) {
    this.group_name = group_name;
    this.set_value = set_value;
    this.description = description;
    this.additional = additional;
    this.created_by = created_by;
  }
}

export const LovSchema = SchemaFactory.createForClass(Lov);
