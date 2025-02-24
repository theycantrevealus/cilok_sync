import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
export type KeywordSegmentationDocument = KeywordSegmentation & Document;

@Schema()
export class KeywordSegmentation {
  @Prop({ type: SchemaTypes.String })
  group_name: string;

  @Prop({ type: SchemaTypes.String })
  set_value: string;

  @Prop({ type: SchemaTypes.String })
  description: string;

  constructor(group_name?: string, set_value?: string, description?: string) {
    this.group_name = group_name;
    this.set_value = set_value;
    this.description = description;
  }
}

export const KeywordSegmentationSchema =
  SchemaFactory.createForClass(KeywordSegmentation);
