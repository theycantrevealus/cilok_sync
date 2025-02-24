import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId } from "bson";
import { Type } from "class-transformer";

export type StockDocument = Stock & Document;

@Schema({
  collection: "stocks",
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  optimisticConcurrency : true
})
export class Stock {
  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  @Type(() => ObjectId)
  location: string;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  @Type(() => ObjectId)
  product: string;

  @Prop({
    index: true,
    isRequired: false,
    type: ObjectId
  })
  @Type(() => ObjectId)
  keyword: string;

  @Prop({
    isRequired: true,
    type: Number
  })
  balance: number;

  @Prop({
    isRequired: false,
    type: Number
  })
  initial_balance?: number;

  @Prop({
    isRequired: true,
    type: Number,
    default: 0,
  })
  balance_flashsale: number;
}

export const StockSchema = SchemaFactory.createForClass(Stock);

// Added Multi Index Unique
StockSchema.index({ location: 1, product: 1, keyword: 1 }, { unique: true });
// StockSchema.index({ location: 1, product: 1 });
