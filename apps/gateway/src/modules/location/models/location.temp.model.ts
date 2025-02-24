import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Lov } from '@/lov/models/lov.model';
export type LocationTempDocument = LocationTemp & Document;

@Schema({ collection: 'location_temps' })
export class LocationTemp {
  @Prop({ type: SchemaTypes.String })
  code: string;

  @Prop({
    type: SchemaTypes.String,
  })
  data_source: string;

  @Prop({ type: Types.ObjectId, ref: LocationTemp.name })
  @Type(() => LocationTemp)
  adhoc_group: LocationTemp[];

  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  type: Lov;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: LocationTemp.name })
  @Type(() => LocationTemp)
  parent: LocationTemp;

  @Prop({ type: SchemaTypes.Number })
  lac: number;

  @Prop({ type: SchemaTypes.Number })
  cell_id: number;

  @Prop({ type: SchemaTypes.String })
  longitude: string;

  @Prop({ type: SchemaTypes.String })
  latitude: string;

  @Prop({ type: SchemaTypes.String })
  area: string;

  @Prop({ type: SchemaTypes.String })
  region: string;

  @Prop({ type: SchemaTypes.String })
  city: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: LocationTemp.name,
    required: false,
    default: null,
  })
  @Type(() => LocationTemp)
  area_id: LocationTemp | null;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: LocationTemp.name,
    required: false,
    default: null,
  })
  @Type(() => LocationTemp)
  region_id: LocationTemp | null;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: LocationTemp.name,
    required: false,
    default: null,
  })
  @Type(() => LocationTemp)
  city_id: LocationTemp | null;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
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
    code?: string,
    data_source?: string,
    adhoc_group?: LocationTemp[],
    name?: string,
    type?: Lov,
    parent?: LocationTemp | null,
    created_by?: Account | null,
  ) {
    this.code = code;
    this.data_source = data_source;
    this.adhoc_group = adhoc_group;
    this.name = name;
    this.type = type;
    this.parent = parent;
    this.created_by = created_by;
  }
}

export const LocationTempSchema = SchemaFactory.createForClass(LocationTemp);
