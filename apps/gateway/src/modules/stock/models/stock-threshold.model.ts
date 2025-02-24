import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { SchemaTypes } from 'mongoose';
import { string } from 'yargs';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { StockThresholdType } from '../enum/stock-threshold-type.enum';

export type StockThresholdDocument = StockThreshold & Document;

@Schema({
  collection: 'stock_thresholds',
})
export class StockThreshold {
  // _id: ObjectId;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId,
  })
  keyword_id: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  keyword: string;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId,
  })
  location: any;

  @Prop({
    isRequired: true,
    type: String,
  })
  bonus_type: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  product_id: string;

  @Prop({
    isRequired: true,
    type: Number,
  })
  stock_threshold: number;

  @Prop({
    isRequired: true,
    type: Number,
    default: 0,
  })
  maximum_threshold: number;

  @Prop({
    isRequired: true,
    type: String,
    default: StockThresholdType.DAILY,
    enum: StockThresholdType,
  })
  type: string;

  @Prop({
    index: true,
    isRequired: true,
    type: Array,
  })
  schedule: Array<string>;

  @Prop({
    required: true,
    type: SchemaTypes.String,
  })
  start_from: string;

  @Prop({
    required: true,
    type: SchemaTypes.String,
  })
  end_at: string;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ index: true, type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const StockThresholdSchema =
  SchemaFactory.createForClass(StockThreshold);
StockThresholdSchema.index(
  { start_from: 1, end_at: 1, schedule: 1, deleted_at: 1 },
  { unique: true },
);
