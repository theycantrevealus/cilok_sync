import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location } from '@/location/models/location.model';

import { MerchantV2, rawMerchant } from './merchant.model.v2';
export type OutletDocument = Outlet & Document;

export const rawOutlet = raw({
  _id: { type: SchemaTypes.ObjectId },
  outlet_code: { type: String },
  regional: { type: String },
  branch: { type: String },
  outlet_name: { type: String },
  outlet_address: { type: String },
  longtitude: { type: String },
  latitude: { type: String },
});

@Schema()
export class Outlet {
  @Prop({ type: SchemaTypes.String, unique: true })
  outlet_code: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  regional: Location;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  branch: Location;

  @Prop({ type: SchemaTypes.String })
  outlet_name: string;

  @Prop({ type: SchemaTypes.String })
  outlet_address: string;

  @Prop({ type: SchemaTypes.String })
  longtitude: string;

  @Prop({ type: SchemaTypes.String })
  latitude: string;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  show_linked: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'merchantv2',
    default: null,
  })
  merchant_id: string;

  @Prop(
    raw({
      _id: { type: SchemaTypes.ObjectId },
      merchant_name: { type: String },
      merchant_short_code: { type: String },
    }),
  )
  merchant_detail: MerchantV2;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_id: Location;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_type: Location;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_area_identifier: Location;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_region_identifier: Location;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
  _id: any;

  constructor(
    outlet_code?: string,
    regional?: Location,
    branch?: Location,
    outlet_name?: string,
    outlet_address?: string,
    longtitude?: string,
    latitude?: string,
    show_linked?: boolean,
    merchant_id?: string,
  ) {
    this.outlet_code = outlet_code;
    this.regional = regional;
    this.branch = branch;
    this.outlet_name = outlet_name;
    this.outlet_address = outlet_address;
    this.longtitude = longtitude;
    this.latitude = latitude;
    this.show_linked = show_linked;
    this.merchant_id = merchant_id;
  }
}

export const OutletSchema = SchemaFactory.createForClass(Outlet);
