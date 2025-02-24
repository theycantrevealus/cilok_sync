import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { CustomerBadge } from '@/customer/models/customer.badge.model';
import { CustomerBrand } from '@/customer/models/customer.brand.model';
import { Customer } from '@/customer/models/customer.model';
import { CustomerTier } from '@/customer/models/customer.tier.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';

export type ProgramSegmentationDocument = ProgramSegmentation & Document;

@Schema()
export class ProgramSegmentation {
  @Prop({ type: Types.ObjectId, ref: Customer.name })
  @Type(() => Customer)
  customer_msisdn: Customer;

  @Prop({ type: Types.ObjectId, ref: CustomerTier.name })
  @Type(() => CustomerTier)
  customer_tier: CustomerTier;

  @Prop({ type: SchemaTypes.Boolean })
  customer_los_enable: boolean;

  @Prop({ type: SchemaTypes.String })
  customer_los_type: string;

  @Prop({ type: SchemaTypes.String })
  customer_los_value: string;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  customer_type: Lov;

  @Prop({ type: Types.ObjectId, ref: CustomerBadge.name })
  @Type(() => CustomerBadge)
  customer_bedges: CustomerBadge;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  customer_location: Location;

  @Prop({ type: Types.ObjectId, ref: CustomerBrand.name })
  @Type(() => CustomerBrand)
  customer_brand: CustomerBrand;

  @Prop({ type: SchemaTypes.Number })
  customer_point_balance: number;

  @Prop({ type: SchemaTypes.String })
  customer_preferences: string;

  @Prop({ type: SchemaTypes.String })
  customer_ARPU: string;

  constructor(
    customer_msisdn?: Customer,
    customer_tier?: CustomerTier,
    customer_los_enable?: boolean,
    customer_los_type?: string,
    customer_los_value?: string,
    customer_type?: Lov,
    customer_bedges?: CustomerBadge,
    customer_location?: Location,
    customer_brand?: CustomerBrand,
    customer_point_balance?: number,
    customer_preferences?: string,
    customer_ARPU?: string,
  ) {
    this.customer_msisdn = customer_msisdn;
    this.customer_tier = customer_tier;
    this.customer_los_enable = customer_los_enable;
    this.customer_los_type = customer_los_type;
    this.customer_los_value = customer_los_value;
    this.customer_type = customer_type;
    this.customer_bedges = customer_bedges;
    this.customer_location = customer_location;
    this.customer_brand = customer_brand;
    this.customer_point_balance = customer_point_balance;
    this.customer_preferences = customer_preferences;
    this.customer_ARPU = customer_ARPU;
  }
}

export const ProgramSegmentationSchema =
  SchemaFactory.createForClass(ProgramSegmentation);
