import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { LocationBucket } from '@/location/models/location.bucket.model';
import { Location } from '@/location/models/location.model';
export type KeywordStockLocationDocument = KeywordStockLocation & Document;

@Schema()

export class KeywordStockLocation {
  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_id: string;

  //   @Prop({ type: SchemaTypes.Number })
  //   limit: number;

  @Prop({ type: SchemaTypes.Decimal128 })
  @IsNumber()
  stock: number;

  @Prop({ type: SchemaTypes.Decimal128 })
  @IsNumber()
  stock_flashsale: number;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  // @ValidateNested({each: true})
  adhoc_group: any;

  @Prop({ type: SchemaTypes.Mixed, ref: LocationBucket.name, default: null })
  @Type(() => LocationBucket)
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  bucket: string | null = null;

  @IsString()
  @IsOptional()
  name: string;
  length: number;
  //   @Prop({ type: SchemaTypes.Number })
  //   qty_denom: number;

  //   @Prop({ type: SchemaTypes.String })
  //   payment: string;

  //   @Prop({ type: SchemaTypes.String })
  //   granular: string;

  //   @Prop({ type: SchemaTypes.String })
  //   bid: string;

  //   @Prop({ type: SchemaTypes.String })
  //   bonus_id: string;

  //   @Prop({ type: SchemaTypes.String })
  //   bonus_name: string;

  constructor(
    location_id?: string,
    adhoc_group?: any,
    stock?: number,
    stock_flashsale?: number,
    bucket: string | null = null,
    name?: string,
  ) {
    this.location_id = location_id;
    this.adhoc_group = adhoc_group;
    this.stock = stock;
    this.stock_flashsale = stock_flashsale;
    this.bucket = bucket;
    this.name = name
  }
}

export const KeywordStockLocationSchema =
  SchemaFactory.createForClass(KeywordStockLocation);
