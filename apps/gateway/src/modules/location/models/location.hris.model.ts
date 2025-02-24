import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { Lov } from '../../lov/models/lov.model';
import { Location } from './location.model';

export type LocationHrisDocument = LocationHris & Document;

@Schema({ collection: 'location_hris' })
export class LocationHris {
  @Prop({
    type: SchemaTypes.String,
  })
  data_source: string;

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location: Location;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  type: Lov;

  @Prop({ type: SchemaTypes.Mixed })
  remark: any;

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
    data_source?: string,
    name?: string,
    location?: Location | null,
    type?: Lov,
    remark?: any,
  ) {
    this.data_source = data_source;
    this.name = name;
    this.location = location;
    this.type = type;
    this.remark = remark;
  }
}

export const LocationHrisSchema = SchemaFactory.createForClass(LocationHris);
