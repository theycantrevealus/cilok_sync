import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { Document} from 'mongoose';

import { CommonSchemaInventoryModel } from '@/inventory/models/common-schema-inventory.model';

export type ProductSubcategoryDocument = ProductSubcategory & Document;

@Schema()
export class ProductSubcategory extends CommonSchemaInventoryModel {
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
  @Prop({ type: String, required: false })
  category_id: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true, index: true })
  core_product_subcategory_id: string;
}

export const ProductSubcategorySchema = SchemaFactory.createForClass(ProductSubcategory);
