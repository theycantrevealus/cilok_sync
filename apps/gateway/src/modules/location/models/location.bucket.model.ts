import { TimeManagement } from '@/application/utils/Time/timezone';
import { Lov } from '@/lov/models/lov.model';
import { PIC } from '@/pic/models/pic.model';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Location } from './location.model';
export type LocationBucketDocument = LocationBucket & Document;

@Schema()
export class LocationBucket {
  @Prop({ 
    type: SchemaTypes.String, 
  })
  bucket_name: String;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    ref: Lov.name 
  })
  @Type(() => Object)
  bucket_type: object;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    ref: PIC.name 
  })
  @Type(() => Object)
  pic: object;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    ref: Location.name 
  })
  @Type(() => Object)
  location_data: object;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: false,
    ref: Lov.name 
  })
  @Type(() => Object)
  location_type_data: object | null;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: false,
    ref: Location.name 
  })
  @Type(() => Object)
  location_area_data: object | null;

  @Prop({ 
    type: mongoose.Schema.Types.Mixed, 
    required: false,
    ref: Location.name 
  })
  @Type(() => Object)
  location_region_data: object | null;

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

  @Prop({type: SchemaTypes.String,default: null})
  element1: string;

  constructor(
    bucket_name?: String, 
    bucket_type?: Lov, 
    pic?: PIC, 
    location_data?: Location, 
    element1?: string,
  ) {
    this.bucket_name = bucket_name;
    this.bucket_type = bucket_type;
    this.pic = pic;
    this.location_data = location_data;
    this.element1 = element1;
  }
}

export const LocationBucketSchema =
  SchemaFactory.createForClass(LocationBucket);
