import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Type } from 'class-transformer';

export type StockSummaryDocument = StockSummary & Document;

@Schema({
  collection: 'stocks_summary',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  optimisticConcurrency: true,
})
export class StockSummary {
  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId,
  })
  @Type(() => ObjectId)
  product: string;

  @Prop({
    index: true,
    isRequired: false,
    type: ObjectId,
  })
  @Type(() => ObjectId)
  keyword: string;

  @Prop({
    isRequired: true,
    type: Number,
  })
  balance: number;
}

export const StockSummarySchema = SchemaFactory.createForClass(StockSummary);

// Added Multi Index Unique
StockSummarySchema.index({ product: 1, keyword: 1 }, { unique: true });
