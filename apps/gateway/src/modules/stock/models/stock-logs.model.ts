import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId } from "bson";

export type StockLogDocument = StockLogs & Document;

@Schema({
  collection: "stock_logs",
})
export class StockLogs {
  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  location: string;

  @Prop({
    index: true,
    isRequired: false,
    type: ObjectId
  })
  keyword: string;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  product: string;

  @Prop({
    isRequired: true,
    type: Number
  })
  balance: number;

  @Prop({
    isRequired: true,
    type: Number
  })
  in: number;

  @Prop({
    isRequired: true,
    type: Number
  })
  out: number;

  @Prop({
    isRequired: true,
    type: ObjectId
  })
  account: string;

  @Prop({
    index: true,
    isRequired: true,
    type: String
  })
  remark: string;

  @Prop({
    default: null,
    type: Number
  })
  remaining: number;

  @Prop({
    isRequired: false,
    type: String
  })
  transaction_id?: string;

  @Prop({
    isRequired: false,
    type: String
  })
  notification_code?: string;

  @Prop({
    isRequired: false,
    type: String
  })
  stock_update_id?: string;

  @Prop({
    isRequired: true,
    type: Date
  })
  logged_at: Date;

  @Prop({
    isRequired: false,
    default: false,
    type: Boolean
  })
  is_flashsale: boolean
}

export const StockLogSchema = SchemaFactory.createForClass(StockLogs);
// StockLogSchema.index({ keyword: 1, location: 1, remark: 1 });
