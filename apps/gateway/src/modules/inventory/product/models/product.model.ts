import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsBoolean, IsDefined, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Document } from 'mongoose';

import { CommonSchemaInventoryModel } from '@/inventory/models/common-schema-inventory.model';
import { Type } from 'class-transformer';
import { ProductAttributeRequestDto } from '../dtos/product-attribute.request';
import { ProductDiscountRequestDto } from '../dtos/product-discount.request';
import { ProductExpiryRequestDto } from '../dtos/product-expiry.request';

export type ProductInventoryDocument = ProductInventory & Document;

@Schema()
export class ProductInventory extends CommonSchemaInventoryModel {
  @IsString()
  @Prop({ type: String, required: false })
  locale: string;

  @IsString()
  @Prop({ type: String, required: false })
  type: string;

  @IsString()
  @Prop({ type: String, required: false })
  sub_type: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  code: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  name: string;

  @IsString()
  @Prop({ type: String, required: false })
  desc: string;

  @IsString()
  @Prop({ type: String, required: false })
  remark: string;

  @IsNumber()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: Number, required: true })
  retail_price: number;

  @IsNumber()
  @Prop({ type: Number, required: false })
  bonus: number;

  @IsNumber()
  @Prop({ type: Number, required: false })
  qty: number;

  @IsString()
  @Prop({ type: String, required: false })
  currency: string;

  @IsString()
  @Prop({ type: String, required: false })
  unit: string;

  @IsBoolean()
  @Prop({ type: Boolean, required: false })
  skip_stock: boolean;

  @IsString()
  @Prop({ type: Array, required: false })
  hashtags: string[];

  @IsString()
  @Prop({ type: String, required: false })
  status: string;

  @IsString()
  @Prop({ type: String, required: false })
  action: string;


  @IsString()
  @Prop({ type: String, required: false })
  sub_category_id: string;

  @IsString()
  @Prop({ type: String, required: false })
  category_id: string;

  @Prop({ type: String, required: false })
  image: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  core_product_id: string;

  @Prop({ type: Number, required: false })
  core_version?: number;

  @Prop({ type: ProductExpiryRequestDto, required: false })
  expiry: ProductExpiryRequestDto;


  @Prop({ type: ProductDiscountRequestDto, required: false })
  discount: ProductDiscountRequestDto;

  @Prop({ type: ProductAttributeRequestDto, required: false })
  attributes: ProductAttributeRequestDto[];
}

export const ProductInventorySchema = SchemaFactory.createForClass(ProductInventory);

