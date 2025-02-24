import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { KeywordStockLocation } from '@/keyword/models/keyword.stock.location.model';
export type KeywordLuckyDrawDocument = KeywordLuckyDraw & Document;

@Schema()
export class KeywordLuckyDraw {
  @IsString()
  bonus_type: string;

  @IsNotEmpty()
  lucky_draw_reguler: boolean;

  @IsNotEmpty()
  lucky_draw_allow_inject_coupon: boolean;

  @IsString()
  lucky_draw_prize: string;

  @IsBoolean()
  @IsNotEmpty()
  redeem_after_verification: boolean;

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

  // stock_location:any;

  @ApiProperty({
    enum: ['Fixed', 'Flexible', 'Fixed-Multiple'],
    example: 'Fixed',
    description: `Value POIN:
    <ol>
    <li>Fixed</li>
    <li>Flexible</li>
    <li>Fixed-Multiple</li>
    </ol>
    <p>Fixed: Fixed poin per redeem.<br />
    Flexible: customer can specify total poin per redeem i.e for program related to donation, lucky draw etc.</p>`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  flexibility: string;

  @ApiProperty({
    example: '1',
    description: 'Bonus Quantity',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsNumber()
  @Prop({ type: [SchemaTypes.Number] })
  bonus_quantity: number;

  constructor(
    bonus_type?: string,
    lucky_draw_reguler?: boolean,
    lucky_draw_allow_inject_coupon?: boolean,
    lucky_draw_prize?: string,
    redeem_after_verification?: boolean,
    stock_location?: KeywordStockLocation[],
    stock_type?: string,
    threshold?: number,
    start_date?: string,
    end_date?: string,
    hour?: string[],
    flexibility?: string,
    bonus_quantity?: number,
  ) {
    this.bonus_type = bonus_type;
    this.lucky_draw_reguler = lucky_draw_reguler;
    this.lucky_draw_allow_inject_coupon = lucky_draw_allow_inject_coupon;
    this.lucky_draw_prize = lucky_draw_prize;
    this.redeem_after_verification = redeem_after_verification;
    this.stock_location = stock_location;
    this.stock_type = stock_type;
    this.threshold = threshold;
    this.start_date = start_date;
    this.end_date = end_date;
    this.hour = hour;
    this.flexibility = flexibility;
    this.bonus_quantity = bonus_quantity;
  }
}

const exampleLuckyDraw: KeywordLuckyDraw = new KeywordLuckyDraw(
  'lucky_draw',
  true,
  false,
  'STRING OF PRIZE NAME',
  false,
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
      10,
    ),
  ],
  'no_threshold',
  10,
  '2024-04-15T17:00:00.000Z',
  '2024-04-15T17:00:00.000Z',
  ['01', '02'],
  'Fixed',
  1,
);
export { exampleLuckyDraw };

export const KeywordLuckyDrawSchema =
  SchemaFactory.createForClass(KeywordLuckyDraw);
