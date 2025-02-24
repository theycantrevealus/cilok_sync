import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

export type AuctionBidderDocument = AuctionBidder & Document;

@Schema({
  collection: 'auction_bidder',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class AuctionBidder {
  @ApiProperty({
    required: false,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  transaction_id: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  msisdn: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  keyword: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  keyword_type: string;

  @ApiProperty({
    required: true,
    type: Number,
  })
  @IsNumber()
  @Prop({ type: SchemaTypes.Number, required: true })
  bid_point: number;

  @ApiProperty({
    required: true,
    type: Date,
  })
  @IsDate()
  @Prop({
    type: SchemaTypes.Date,
  })
  bid_at: Date;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsDate()
  @Prop({
    type: SchemaTypes.Date,
  })
  event_time: Date;

  @Prop({ type: Object, default: null, required: false })
  refund: object;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_winning: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_already_send_notif: boolean;
}
export const AuctionBidderSchema = SchemaFactory.createForClass(AuctionBidder);
