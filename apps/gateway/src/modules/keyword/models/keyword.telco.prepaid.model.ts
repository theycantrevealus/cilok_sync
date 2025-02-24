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

import { KeywordStockLocation } from './keyword.stock.location.model';
export type KeywordTelcoPrepaidDocument = KeywordTelcoPrepaid & Document;

@Schema()
export class KeywordTelcoPrepaid {
  @IsString()
  bonus_type: string;

  @IsString()
  telco_pre_product_name: string;

  @IsString()
  telco_pre_bid: string;

  @IsString()
  telco_pre_api_config: string;

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

  @IsBoolean()
  @IsNotEmpty()
  redeem_after_verification: boolean;

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

  constructor(
    bonus_type?: string,
    telco_pre_product_name?: string,
    telco_pre_bid?: string,
    telco_pre_api_config?: string,
    stock_location?: KeywordStockLocation[],
    redeem_after_verification?: boolean,
    stock_type?: string,
    threshold?: number,
    start_date?: string,
    end_date?: string,
    hour?: string[],
    flexibility?: string,
  ) {
    this.bonus_type = bonus_type;
    this.telco_pre_product_name = telco_pre_product_name;
    this.telco_pre_bid = telco_pre_bid;
    this.telco_pre_api_config = telco_pre_api_config;
    this.stock_location = stock_location;
    this.redeem_after_verification = redeem_after_verification;
    this.stock_type = stock_type;
    this.threshold = threshold;
    this.start_date = start_date;
    this.end_date = end_date;
    this.hour = hour;
    this.flexibility = flexibility;
  }
}

const exampleTelcoPre: KeywordTelcoPrepaid = new KeywordTelcoPrepaid(
  'telco_prepaid',
  'telco_post_product_name',
  'telco_post_bid',
  'telco_post_api_config',
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
  false,
  'no_threshold',
  10,
  '2024-04-15T17:00:00.000Z',
  '2024-04-15T17:00:00.000Z',
  ['01', '02'],
  'Fixed',
);
export { exampleTelcoPre };

export const KeywordTelcoPrepaidSchema =
  SchemaFactory.createForClass(KeywordTelcoPrepaid);
