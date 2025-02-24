import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';
export type ProductDocument = Product & Document;

@Schema()
export class Product {
  @Prop({ type: SchemaTypes.String })
  group_name: string;

  @Prop({ type: SchemaTypes.String })
  set_value: string;

  constructor(group_name?: string, set_value?: string) {
    this.group_name = group_name;
    this.set_value = set_value;
  }
}

export const ProductSchema = SchemaFactory.createForClass(Product);
