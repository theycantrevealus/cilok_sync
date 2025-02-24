import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

@Schema({ collection: 'ext_b_bid_granular' })
export class Bid {
  @Prop({ type: SchemaTypes.String })
  external_product_id: string;

  @Prop({ type: SchemaTypes.Number, default: 0 })
  point: number;

  @Prop({ type: SchemaTypes.ObjectId, isRequired: false })
  point_type: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  keyword: Types.ObjectId;

  @Prop({ type: SchemaTypes.Number })
  contract: number;

  @Prop({ type: SchemaTypes.String, isRequired: false })
  status: string;

  @Prop({ type: SchemaTypes.String, isRequired: false })
  tracing_id: string;

  @Prop({ type: SchemaTypes.String, isRequired: false })
  tracing_inject: string;

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

  @Prop({ type: SchemaTypes.Date, default: null })
  deleted_at: Date | null;

  // New Fields
  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.Date })
  start_date: Date;

  @Prop({ type: SchemaTypes.Date })
  end_date: Date;

  @Prop({ type: SchemaTypes.Boolean })
  tier_multiplier: boolean;

  @Prop({ type: SchemaTypes.Boolean })
  special_multiplier: boolean;

  @Prop({ type: SchemaTypes.Number, default: 1 })
  special_multiplier_value: number;

  @Prop({ type: SchemaTypes.Boolean })
  default_earning: boolean;

  @Prop({ type: SchemaTypes.String })
  keyword_name: string;

  constructor(
    external_product_id?: string,
    point?: number,
    point_type?: Types.ObjectId,
    keyword?: Types.ObjectId,
    contract?: number,
    status?: string,
    tracing_id?: string,
    tracing_inject?: string,
    type?: string,
    start_date?: Date,
    end_date?: Date,
    tier_multiplier?: boolean,
    special_multiplier?: boolean,
    special_multiplier_value?: number,
    default_earning?: boolean,
    keyword_name?: string,
  ) {
    this.external_product_id = external_product_id;
    this.point = point;
    this.point_type = point_type;
    this.keyword = keyword;
    this.contract = contract;
    this.status = status;
    this.tracing_id = tracing_id;
    this.tracing_inject = tracing_inject;
    this.type = type;
    this.start_date = start_date;
    this.end_date = end_date;
    this.tier_multiplier = tier_multiplier;
    this.special_multiplier = special_multiplier;
    this.special_multiplier_value = special_multiplier_value;
    this.default_earning = default_earning;
    this.keyword_name = keyword_name;
  }
}

export const BidSchema = SchemaFactory.createForClass(Bid);
export type BidDocument = Bid & Document;
