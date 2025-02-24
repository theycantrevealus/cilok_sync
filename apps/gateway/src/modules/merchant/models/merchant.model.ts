import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
export type MerchantDocument = Merchant & Document;

@Schema()
export class Merchant {
  @Prop({ type: SchemaTypes.String })
  partner_id: string;

  @Prop({ type: SchemaTypes.String })
  partner_code: string;

  @Prop({ type: SchemaTypes.String })
  company_name: string;

  @Prop({ type: SchemaTypes.String })
  siup_number: string;

  @Prop({ type: SchemaTypes.String })
  province_id: string;

  @Prop({ type: SchemaTypes.String })
  city_id: string;

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

  @Prop({ type: SchemaTypes.String })
  pic_role_id: string;

  @Prop({ type: SchemaTypes.String })
  pic_role: string;

  @Prop({ type: SchemaTypes.String })
  pic_email: string;

  @Prop({ type: SchemaTypes.String })
  jangkauan_outlet: string;

  @Prop({ type: SchemaTypes.String })
  outlet_provice_id: string;

  @Prop({ type: SchemaTypes.String })
  outlet_province_id: string;

  @Prop({ type: SchemaTypes.String })
  outlet_iml: string;

  @Prop({ type: SchemaTypes.String })
  partner_status: string;

  @Prop({ type: SchemaTypes.String })
  password: string;

  @Prop({ type: SchemaTypes.String })
  source_created_at: string;

  @Prop({ type: SchemaTypes.String })
  nat_loc: string;

  @Prop({ type: SchemaTypes.String })
  merchant_id: string;

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

  @Prop({ type: SchemaTypes.String })
  poin_created_by: string;

  @Prop({ type: SchemaTypes.String })
  is_visible: string;

  @Prop({ type: SchemaTypes.String })
  branch: string;

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

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  created_by: any | null;

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

  constructor(
    partner_id: string,
    partner_code: string,
    company_name: string,
    siup_number: string,
    province_id: string,
    city_id: string,
    zip_code: string,
    address: string,
    file_compro: string,
    pic_name: string,
    pic_phone: string,
    pic_role_id: string,
    pic_role: string,
    pic_email: string,
    jangkauan_outlet: string,
    outlet_provice_id: string,
    outlet_province_id: string,
    outlet_iml: string,
    partner_status: string,
    password: string,
    source_created_at: string,
    nat_loc: string,
    merchant_id: string,
    approver_1: string,
    approver_2: string,
    status_desc_1: string,
    status_desc_2: string,
    approver_1_status: string,
    approver_2_status: string,
    approver_date_1: string,
    approver_date_2: string,
    npwp: string,
    poin_created_by: string,
    is_visible: string,
    branch: string,
    ktp: string,
    pic_ktp: string,
    bank_name: string,
    bank_account_name: string,
    bank_account_number: string,
    apps_name: string,
    transaction_id: string,
    channel: string,
    id_business_type_1: string,
    id_business_type_2: string,
    callback_url: string,
    origin_data: string,
    created_by?: Account | null,
  ) {
    this.partner_id = partner_id;
    this.partner_code = partner_code;
    this.company_name = company_name;
    this.siup_number = siup_number;
    this.province_id = province_id;
    this.city_id = city_id;
    this.zip_code = zip_code;
    this.address = address;
    this.file_compro = file_compro;
    this.pic_name = pic_name;
    this.pic_phone = pic_phone;
    this.pic_role_id = pic_role_id;
    this.pic_role = pic_role;
    this.pic_email = pic_email;
    this.jangkauan_outlet = jangkauan_outlet;
    this.outlet_provice_id = outlet_provice_id;
    this.outlet_province_id = outlet_province_id;
    this.outlet_iml = outlet_iml;
    this.partner_status = partner_status;
    this.password = password;
    this.source_created_at = source_created_at;
    this.nat_loc = nat_loc;
    this.merchant_id = merchant_id;
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
    this.branch = branch;
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
  }
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);
