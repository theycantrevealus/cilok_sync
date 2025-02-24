import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location } from '@/location/models/location.model';
import { Outlet, rawOutlet } from '@/merchant/models/outlet.model';
export type MerchantV2Document = MerchantV2 & Document;

export const rawMerchant = raw({
  _id: { type: SchemaTypes.ObjectId },
  merchant_name: { type: String },
  merchant_short_code: { type: String },
});

@Schema()
export class MerchantV2 {
  @Prop({ type: SchemaTypes.String })
  partner_id: string;

  @Prop({ type: SchemaTypes.String })
  merchant_name: string;

  @Prop({ type: SchemaTypes.String, unique: true })
  merchant_short_code: string;

  @Prop({ type: SchemaTypes.String })
  siup_number: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_id: Location;

  @Prop({ type: SchemaTypes.String })
  zip_code: string;

  @Prop({ type: SchemaTypes.String })
  address: string;

  @Prop({ type: SchemaTypes.String })
  file_compro: string;

  @Prop({ type: SchemaTypes.String })
  pic_name: string;

  @Prop({ type: SchemaTypes.String })
  pic_phone: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  pic_role_id: any | null;

  @Prop({ type: SchemaTypes.String })
  pic_email: string;

  @Prop({ type: SchemaTypes.String })
  source_created_at: string;

  @Prop({ type: SchemaTypes.String })
  nat_loc: string;

  @Prop({ type: SchemaTypes.String })
  approver_1: string;

  @Prop({ type: SchemaTypes.String })
  approver_2: string;

  @Prop({ type: SchemaTypes.String })
  status_desc_1: string;

  @Prop({ type: SchemaTypes.String })
  status_desc_2: string;

  @Prop({ type: SchemaTypes.String })
  approver_1_status: string;

  @Prop({ type: SchemaTypes.String })
  approver_2_status: string;

  @Prop({ type: SchemaTypes.String })
  approver_date_1: string;

  @Prop({ type: SchemaTypes.String })
  approver_date_2: string;

  @Prop({ type: SchemaTypes.String })
  npwp: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  poin_created_by: any | null;

  @Prop({ type: SchemaTypes.String })
  is_visible: string;

  @Prop({ type: SchemaTypes.String })
  ktp: string;

  @Prop({ type: SchemaTypes.String })
  pic_ktp: string;

  @Prop({ type: SchemaTypes.String })
  bank_name: string;

  @Prop({ type: SchemaTypes.String })
  bank_account_name: string;

  @Prop({ type: SchemaTypes.String })
  bank_account_number: string;

  @Prop({ type: SchemaTypes.String })
  apps_name: string;

  @Prop({ type: SchemaTypes.String })
  transaction_id: string;

  @Prop({ type: SchemaTypes.String })
  channel: string;

  @Prop({ type: SchemaTypes.String })
  id_business_type_1: string;

  @Prop({ type: SchemaTypes.String })
  id_business_type_2: string;

  @Prop({ type: SchemaTypes.String })
  callback_url: string;

  @Prop({ type: SchemaTypes.String })
  origin_data: string;

  @Prop({ type: SchemaTypes.String })
  merchant_logo: string;

  @Prop({ type: SchemaTypes.String })
  hyperlink_1: string;

  @Prop({ type: SchemaTypes.Mixed })
  hyperlink_1_title: object | null;

  @Prop({ type: SchemaTypes.String })
  hyperlink_2: string;

  @Prop({ type: SchemaTypes.Mixed })
  hyperlink_2_title: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  title_1: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  content_1: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  title_2: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  content_2: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  title_3: object | null;

  @Prop({ type: SchemaTypes.Mixed })
  content_3: object | null;

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
    type: [rawOutlet],
  })
  outlet: Outlet[];

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
    partner_id?: string,
    merchant_name?: string,
    merchant_short_code?: string,
    siup_number?: string,
    location_id?: Location,
    zip_code?: string,
    address?: string,
    file_compro?: string,
    pic_name?: string,
    pic_phone?: string,
    pic_role_id?: Account | null,
    pic_email?: string,
    source_created_at?: string,
    nat_loc?: string,
    approver_1?: string,
    approver_2?: string,
    status_desc_1?: string,
    status_desc_2?: string,
    approver_1_status?: string,
    approver_2_status?: string,
    approver_date_1?: string,
    approver_date_2?: string,
    npwp?: string,
    poin_created_by?: Account | null,
    is_visible?: string,
    ktp?: string,
    pic_ktp?: string,
    bank_name?: string,
    bank_account_name?: string,
    bank_account_number?: string,
    apps_name?: string,
    transaction_id?: string,
    channel?: string,
    id_business_type_1?: string,
    id_business_type_2?: string,
    callback_url?: string,
    origin_data?: string,
    created_by?: Account | null,
    outlet?: Outlet[],
  ) {
    this.partner_id = partner_id;
    this.merchant_name = merchant_name;
    this.merchant_short_code = merchant_short_code;
    this.siup_number = siup_number;
    this.location_id = location_id;
    this.zip_code = zip_code;
    this.address = address;
    this.file_compro = file_compro;
    this.pic_name = pic_name;
    this.pic_phone = pic_phone;
    this.pic_role_id = pic_role_id;
    this.pic_email = pic_email;
    this.source_created_at = source_created_at;
    this.nat_loc = nat_loc;
    this.approver_1 = approver_1;
    this.approver_2 = approver_2;
    this.status_desc_1 = status_desc_1;
    this.status_desc_2 = status_desc_2;
    this.approver_1_status = approver_1_status;
    this.approver_2_status = approver_2_status;
    this.approver_date_1 = approver_date_1;
    this.approver_date_2 = approver_date_2;
    this.npwp = npwp;
    this.poin_created_by = poin_created_by;
    this.is_visible = is_visible;
    this.ktp = ktp;
    this.pic_ktp = pic_ktp;
    this.bank_name = bank_name;
    this.bank_account_name = bank_account_name;
    this.bank_account_number = bank_account_number;
    this.apps_name = apps_name;
    this.transaction_id = transaction_id;
    this.channel = channel;
    this.id_business_type_1 = id_business_type_1;
    this.id_business_type_2 = id_business_type_2;
    this.callback_url = callback_url;
    this.origin_data = origin_data;
    this.created_by = created_by;
    this.outlet = outlet;
  }
}

export const MerchantV2Schema = SchemaFactory.createForClass(MerchantV2);
