import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId } from "bson";
import { boolean } from "yargs";

export type StockReserveDocument = StockReserve & Document;

@Schema({
  collection: "stock_reserve",
  timestamps :{
    createdAt: true,
    updatedAt: true
  }
})
export class StockReserve {
  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  keyword: string;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  origin_location: string;

  @Prop({
    index: true,
    isRequired: true,
    type: ObjectId
  })
  destination_location: string;

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
    type: ObjectId
  })
  account: string;

  @Prop({
    index: true,
    isRequired: true,
    type: String,
    enum: [ "Booked", "Active", "Redeemed"]
  })
  status: string;

  @Prop({
    isRequired: true,
    type: Boolean,
  })
  is_flashsale: boolean;
}

export const StockReserveSchema = SchemaFactory.createForClass(StockReserve);

