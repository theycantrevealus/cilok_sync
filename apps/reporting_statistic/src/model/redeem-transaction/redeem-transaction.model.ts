import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDateString, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

export type ReportRedeemTransactionDocument = ReportRedeemTransaction & Document;

@Schema({ collection: 'report_redeem_transaction' })
export class ReportRedeemTransaction {
  @IsDateString()
  @Prop({ type: SchemaTypes.Date, required: true, index: true })
  transaction_date: Date;

  @IsString()
  @Prop({ type: SchemaTypes.String, index: true })
  transaction_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  keyword_title: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: 'IMED' })
  execution_type: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  product_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  period1: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  period2: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  subscriber_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  return_value: string;

  @IsDateString()
  @Prop({ type: SchemaTypes.Date })
  execution_date: Date;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  channel_code: string;

  @IsString()
  @Prop({ type: SchemaTypes.Number })
  transaction_status: number;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  trdm_last_act: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  trdm_act_status: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  trdm_evd_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  trdm_flag_kirim: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  trdm_geneva_exec: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  trdm_keyword: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  trdm_tgl_kirim: string;

  @IsString()
  @Prop({ type: SchemaTypes.String, default: '' })
  channel_transaction_id: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  card_type: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  brand: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  subscriber_region: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  subscriber_branch: string;

  @IsString()
  @Prop({ type: SchemaTypes.String })
  lacci: string;
  

  constructor(
    transaction_date: Date,
    transaction_id: string,
    keyword: string,
    keyword_title: string,
    execution_type: string,
    product_id: string,
    period1: string,
    period2: string,
    subscriber_id: string,
    msisdn: string,
    return_value: string,
    execution_date: Date,
    channel_code: string,
    transaction_status: number,
    trdm_last_act: string,
    trdm_act_status: string,
    trdm_evd_id: string,
    trdm_flag_kirim: string,
    trdm_geneva_exec: string,
    trdm_keyword: string,
    trdm_tgl_kirim: string,
    channel_transaction_id: string,
    card_type: string,
    brand: string,
    subscriber_region: string,
    subscriber_branch: string,
    lacci: string,
  ) {
    this.transaction_date = transaction_date;
    this.transaction_id = transaction_id;
    this.keyword = keyword;
    this.keyword_title = keyword_title;
    this.execution_type = execution_type;
    this.product_id = product_id;
    this.period1 = period1;
    this.period2 = period2;
    this.subscriber_id = subscriber_id;
    this.msisdn = msisdn;
    this.return_value = return_value;
    this.execution_date = execution_date;
    this.channel_code = channel_code;
    this.transaction_status = transaction_status;
    this.trdm_last_act = trdm_last_act;
    this.trdm_act_status = trdm_act_status;
    this.trdm_evd_id = trdm_evd_id;
    this.trdm_flag_kirim = trdm_flag_kirim;
    this.trdm_geneva_exec = trdm_geneva_exec;
    this.trdm_keyword = trdm_keyword;
    this.trdm_tgl_kirim = trdm_tgl_kirim;
    this.channel_transaction_id = channel_transaction_id;
    this.card_type = card_type;
    this.brand = brand;
    this.subscriber_region = subscriber_region;
    this.subscriber_branch = subscriber_branch;
    this.lacci = lacci;
  }
}

export const ReportRedeemTransactionSchema = SchemaFactory.createForClass(ReportRedeemTransaction);
