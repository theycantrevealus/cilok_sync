import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { Document} from 'mongoose';

import { CommonSchemaInventoryModel } from '@/inventory/models/common-schema-inventory.model';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema()
export class ProductCategory extends CommonSchemaInventoryModel {
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  locale: string;
  
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  name: string;
  
  @IsString()
  @Prop({ type: String, required: false })
  desc: string;
   
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  status: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  core_product_category_id: string;
}

export const ProductCategorySchema = SchemaFactory.createForClass(ProductCategory);
