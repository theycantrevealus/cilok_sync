import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import {CustomerTier} from "@/customer/models/customer.tier.model";
import {CustomerBrand} from "@/customer/models/customer.brand.model";

export type SubscriberInfoDocument = Customer & Document;

@Schema()
export class Customer {
  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.Date })
  activation_date: Date;

  @Prop({ type: SchemaTypes.Date })
  expire_date: Date;

  @Prop({ type: SchemaTypes.Number })
  los: number;

  @Prop({ type: SchemaTypes.String })
  rev_m1: string;

  @Prop({ type: Types.ObjectId, ref: CustomerTier.name })
  @Type(() => CustomerTier)
  loyalty_tier: CustomerTier;

  @Prop({ type: Types.ObjectId, ref: CustomerBrand.name })
  @Type(() => CustomerBrand)
  brand: CustomerBrand;

  @Prop({ type: SchemaTypes.String })
  arpu: string;

  @Prop({ type: SchemaTypes.String })
  nik_dob: string;

  @Prop({ type: SchemaTypes.String })
  nik_rgn_name: string;

  @Prop({ type: SchemaTypes.String })
  region_lacci: string;

  @Prop({ type: SchemaTypes.String })
  cty_nme: string;

  @Prop({ type: SchemaTypes.String })
  kabupaten: string;

  @Prop({ type: SchemaTypes.String })
  kecamatan: string;

  @Prop({ type: SchemaTypes.String })
  cluster_sales: string;

  @Prop({ type: SchemaTypes.Number })
  pre_pst_flag: number;

  @Prop({ type: SchemaTypes.Boolean })
  new_redeemer: boolean;

  @Prop({ type: SchemaTypes.String })
  core_id: string;

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

  @Prop({ type: SchemaTypes.String })
  core_locale: string;

  @Prop({ type: SchemaTypes.String })
  core_channel: string;

  @Prop({ type: SchemaTypes.String })
  core_firstname: string;

  @Prop({ type: SchemaTypes.String })
  core_lastname: string;

  @Prop({ type: SchemaTypes.String })
  core_nickname: string;

  @Prop({ type: SchemaTypes.String })
  core_gender: string;

  @Prop({ type: SchemaTypes.String })
  core_phone: string;

  @Prop({ type: SchemaTypes.String })
  core_email: string;

  @Prop({ type: SchemaTypes.String })
  core_birthdate: string;

  @Prop({ type: SchemaTypes.String })
  core_status: string;

  @Prop({ type: SchemaTypes.String })
  core_realm_id: string;

  @Prop({ type: SchemaTypes.String })
  core_branch_id: string;

  constructor(
    msisdn?: string,
    expire_date?: Date,
    activation_date?: Date,
    los?: number,
    rev_m1?: string,
    loyalty_tier?: CustomerTier,
    brand?: CustomerBrand,
    arpu?: string,
    nik_dob?: string,
    nik_rgn_name?: string,
    region_lacci?: string,
    cty_nme?: string,
    kabupaten?: string,
    kecamatan?: string,
    cluster_sales?: string,
    pre_pst_flag?: number,
    core_id?: string,
    core_locale?: string,
    core_channel?: string,
    core_firstname?: string,
    core_lastname?: string,
    core_nickname?: string,
    core_gender?: string,
    core_phone?: string,
    core_email?: string,
    core_birthdate?: string,
    core_status?: string,
    core_realm_id?: string,
    core_branch_id?: string,
  ) {
    this.msisdn = msisdn;
    this.activation_date = activation_date;
    this.expire_date = expire_date;
    this.los = los;
    this.rev_m1 = rev_m1;
    this.loyalty_tier = loyalty_tier;
    this.brand = brand;
    this.arpu = arpu;
    this.nik_dob = nik_dob;
    this.nik_rgn_name = nik_rgn_name;
    this.region_lacci = region_lacci;
    this.cty_nme = cty_nme;
    this.kabupaten = kabupaten;
    this.kecamatan = kecamatan;
    this.cluster_sales = cluster_sales;
    this.pre_pst_flag = pre_pst_flag;
    this.core_id = core_id;
    this.core_locale = core_locale;
    this.core_channel = core_channel;
    this.core_firstname = core_firstname;
    this.core_lastname = core_lastname;
    this.core_nickname = core_nickname;
    this.core_gender = core_gender;
    this.core_phone = core_phone;
    this.core_email = core_email;
    this.core_status = core_status;
    this.core_realm_id = core_realm_id;
    this.core_branch_id = core_branch_id;
  }
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
