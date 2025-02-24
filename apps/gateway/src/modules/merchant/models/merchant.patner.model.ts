import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
export type MerchantPatnerDocument = MerchantPatner & Document;

@Schema()
export class MerchantPatner {
  @Prop({ type: SchemaTypes.String, unique: true })
  partner_code: string;

  @Prop({ type: SchemaTypes.String })
  partner_name: string;

  @Prop({ type: SchemaTypes.String })
  registration_number: string;

  @Prop({ type: SchemaTypes.String })
  priority: string;

  @Prop({ type: SchemaTypes.String })
  contact_person: string;

  @Prop({ type: SchemaTypes.String })
  phone: string;

  @Prop({ type: SchemaTypes.String })
  contact_email: string;

  @Prop({ type: SchemaTypes.String })
  address: string;

  @Prop({ type: SchemaTypes.String })
  website: string;

  @Prop({ type: SchemaTypes.String })
  remark: string;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({ type: SchemaTypes.String })
  npwp: string;

  @Prop({ type: SchemaTypes.String })
  partner_logo: string;

  @Prop({ type: SchemaTypes.String })
  longtitude: string;

  @Prop({ type: SchemaTypes.String })
  latitude: string;

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
    partner_code?: string,
    partner_name?: string,
    registration_number?: string,
    priority?: string,
    contact_person?: string,
    phone?: string,
    contact_email?: string,
    address?: string,
    website?: string,
    remark?: string,
    status?: string,
    npwp?: string,
    partner_logo?: string,
    longtitude?: string,
    latitude?: string,
  ) {
    (this.partner_code = partner_code),
      (this.partner_name = partner_name),
      (this.registration_number = registration_number),
      (this.priority = priority),
      (this.contact_person = contact_person),
      (this.phone = phone),
      (this.contact_email = contact_email),
      (this.address = address),
      (this.website = website),
      (this.remark = remark),
      (this.status = status),
      (this.npwp = npwp),
      (this.partner_logo = partner_logo);
    this.longtitude = longtitude;
    this.latitude = latitude;
  }
}

export const MerchantPatnerSchema =
  SchemaFactory.createForClass(MerchantPatner);
