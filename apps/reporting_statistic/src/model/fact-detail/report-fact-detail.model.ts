import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
export type ReportFactDetailDocument = ReportFactDetail & Document;

@Schema({ collection: 'report_fact_detail' })
export class ReportFactDetail {
  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  transaction_date: Date;

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  msisdn: string;

  @Prop({
    type: SchemaTypes.String
  })
  keyword : string;

  @Prop({
    type: SchemaTypes.String
  })
  program_name : string;

  @Prop({
    type: SchemaTypes.String
  })
  program_owner : string;

  @Prop({
    type: SchemaTypes.String
  })
  detail_program_owner : string;

  @Prop({
    type: SchemaTypes.String
  })
  created_by : string;

  @Prop({
    type: SchemaTypes.String
  })
  lifestyle : string;

  @Prop({
    type: SchemaTypes.String
  })
  category : string;

  @Prop({
    type: SchemaTypes.String
  })
  keyword_title : string;

  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean
  })
  SMS : Boolean;

  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean
  })
  UMB : Boolean;

  @Prop({
    type: SchemaTypes.String
  })
  point : string;

  @Prop({
    type: SchemaTypes.String
  })
  subscriber_brand : string;

  @Prop({
    type: SchemaTypes.String
  })
  program_regional : string;

  @Prop({
    type: SchemaTypes.String
  })
  cust_value : string | null;

  @Prop({
    type: SchemaTypes.Date
  })
  start_date : Date;

  @Prop({
    type: SchemaTypes.Date
  })
  end_date : Date;

  @Prop({
    type: SchemaTypes.String
  })
  merchant_name : string;

  @Prop({
    type: SchemaTypes.String
  })
  subscriber_region : string;

  @Prop({
    type: SchemaTypes.String
  })
  subscriber_branch : string | null;

  @Prop({
    type: SchemaTypes.String
  })
  channel_code : string;

  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean
  })
  subsidy : Boolean;

  @Prop({
    type: SchemaTypes.String
  })
  subscriber_tier : string;

  @Prop({
    type: SchemaTypes.String
  })
  voucher_code : string;

  constructor(
    transaction_date: Date,
    msisdn: string,
    keyword: string,
    program_name: string,
    program_owner: string,
    detail_program_owner: string,
    created_by: string,
    lifestyle: string,
    category: string,
    keyword_title: string,
    SMS: Boolean,
    UMB: Boolean,
    point: string,
    subscriber_brand: string,
    program_regional: string,
    cust_value: string | null,
    start_date: Date,
    end_date: Date,
    merchant_name: string,
    subscriber_region: string,
    subscriber_branch: string | null,
    channel_code: string,
    subsidy: boolean,
    subscriber_tier: string,
    voucher_code: string | null,
  ) {
    this.transaction_date = transaction_date;
    this.msisdn = msisdn;
    this.keyword = keyword;
    this.program_name = program_name;
    this.program_owner = program_owner;
    this.detail_program_owner = detail_program_owner;
    this.created_by = created_by;
    this.lifestyle = lifestyle;
    this.category = category;
    this.keyword_title = keyword_title;
    this.SMS = SMS;
    this.UMB = UMB;
    this.point = point;
    this.subscriber_brand = subscriber_brand;
    this.program_regional = program_regional;
    this.cust_value = cust_value;
    this.start_date = start_date;
    this.end_date = end_date;
    this.merchant_name = merchant_name;
    this.subscriber_region = subscriber_region;
    this.subscriber_branch = subscriber_branch;
    this.channel_code = channel_code;
    this.subsidy = subsidy;
    this.subscriber_tier = subscriber_tier;
    this.voucher_code = voucher_code;
  }
}

export const ReportFactDetailSchema = SchemaFactory.createForClass(ReportFactDetail);
