import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Keyword } from './keyword.model';
export type KeywordCoreProductDocument = KeywordCoreProduct & Document;

@Schema()
export class KeywordCoreProduct extends Keyword {
  @Prop({ type: SchemaTypes.String })
  core_product_product_id: string;

  @Prop({ type: SchemaTypes.String })
  core_product_product_name: string;

  @Prop({ type: Types.ObjectId, ref: Keyword.name })
  @Type(() => Keyword)
  core_product_bid: Keyword;

  @Prop({ type: Types.ObjectId, ref: Keyword.name })
  @Type(() => Keyword)
  core_product_confirmation_notification: Keyword;

  @Prop({ type: SchemaTypes.String })
  core_product_api_configuration: string;

  constructor(
    core_product_product_id?: string,
    core_product_product_name?: string,
    core_product_bid?: Keyword,
    core_product_confirmation_notification?: Keyword,
    core_product_api_configuration?: string,
  ) {
    super();
    this.core_product_product_id = core_product_product_id;
    this.core_product_product_name = core_product_product_name;
    this.core_product_bid = core_product_bid;
    this.core_product_confirmation_notification =
      core_product_confirmation_notification;
    this.core_product_api_configuration = core_product_api_configuration;
  }
}

export const KeywordCoreProductSchema =
  SchemaFactory.createForClass(KeywordCoreProduct);
