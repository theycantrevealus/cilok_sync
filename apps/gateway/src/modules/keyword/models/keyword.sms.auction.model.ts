import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { KeywordStockLocation } from './keyword.stock.location.model';
export type KeywordSMSAuctionDocument = KeywordSMSAuction & Document;

@Schema()
export class KeywordSMSAuction {
  @IsString()
  bonus_type: string;

  @IsNumber()
  auction_poin_min_bidding: number;

  @IsNumber()
  auction_multiplier_poin: number;

  @IsString()
  auction_multiplier_identifier: string;

  @IsString()
  auction_prize_name: string;

  @ApiProperty({
    type: KeywordStockLocation,
    isArray: true,
    required: false,
    description: 'Set stock per location',
  })
  @Transform((data) => {
    const dataSet = [];
    if (data.value) {
      if (data.value.constructor === Array) {
        data.value.map((e) => {
          if (Object.keys(e).length !== 0) {
            dataSet.push(e);
          }
        });
        return dataSet;
      } else {
        return [];
      }
    } else {
      return [];
    }
  })
  @IsOptional()
  stock_location: KeywordStockLocation[];

  @IsString()
  stock_type: string;

  @IsNumber()
  @IsOptional()
  threshold: number;

  @ApiProperty({
    example: '2024-04-15T17:00:00.000Z',
    description: 'start_date stock thershold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: [SchemaTypes.String] })
  start_date: string;

  @ApiProperty({
    example: '2024-04-15T17:00:00.000Z',
    description: 'end_date stock thershold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: [SchemaTypes.String] })
  end_date: string;

  @ApiProperty({
    example: ['01', '17'],
    description: 'Time max redeem treshold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString({ each: true })
  @Prop({ type: [SchemaTypes.String], default: [] })
  hour: string[];

  constructor(
    bonus_type?: string,
    auction_poin_min_bidding?: number,
    auction_multiplier_poin?: number,
    auction_multiplier_identifier?: string,
    auction_prize_name?: string,
    stock_location?: KeywordStockLocation[],
    stock_type?: string,
    threshold?: number,
    start_date?: string,
    end_date?: string,
    hour?: string[],
  ) {
    this.bonus_type = bonus_type;
    this.auction_poin_min_bidding = auction_poin_min_bidding;
    this.auction_multiplier_poin = auction_multiplier_poin;
    this.auction_multiplier_identifier = auction_multiplier_identifier;
    this.auction_prize_name = auction_prize_name;
    this.stock_location = stock_location;
    this.stock_type = stock_type;
    this.threshold = threshold;
    this.start_date = start_date;
    this.end_date = end_date;
    this.hour = hour;
  }
}

const exampleSMSAuction: KeywordSMSAuction = new KeywordSMSAuction(
  'sms_auction',
  22,
  0,
  'VALUE || LAST_BID',
  'prize_name',
  [
    new KeywordStockLocation(
      '62ffd9ed1e38fbdeb16f1f53',
      [
        {
          location_id: '63e270ebd2c9125c887c0bb8',
          name: 'WONOGIRI',
        },
        {
          location_id: '63e270edd2c9125c887c13c5',
          name: 'WONOSOBO',
        },
      ],
      10,
    ),
    new KeywordStockLocation(
      '62ffd9ed1e38fbdeb16f1f53',
      [
        {
          location_id: '63e270ebd2c9125c887c0bb8',
          name: 'WONOGIRI',
        },
        {
          location_id: '63e270edd2c9125c887c13c5',
          name: 'WONOSOBO',
        },
      ],
      22,
    ),
  ],
  'no_threshold',
  10,
  '2024-04-15T17:00:00.000Z',
  '2024-04-15T17:00:00.000Z',
  ['01', '02'],
);
export { exampleSMSAuction };

export const KeywordEAuctionSchema =
  SchemaFactory.createForClass(KeywordSMSAuction);
