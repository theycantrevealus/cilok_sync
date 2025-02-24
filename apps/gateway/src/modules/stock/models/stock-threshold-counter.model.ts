import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId } from "bson";
import { Type } from "class-transformer";
import { SchemaTypes } from "mongoose";
import { TimeManagement } from '@/application/utils/Time/timezone';

export type StockThresholdCounterDocument = StockThresholdCounter & Document;

@Schema({
  collection: "stock_threshold_counter",
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})
export class StockThresholdCounter {
  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  @Type(() => ObjectId)
  stock_id: string;

  @Prop({
    isRequired: true,
    type: Number
  })
  threshold_counter: number;
  
  @Prop({
    isRequired: true,
    type: Number
  })
  threshold_amount: number;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  start_date: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  end_date: Date;
}

export const StockThresholdCounterSchema = SchemaFactory.createForClass(StockThresholdCounter);
