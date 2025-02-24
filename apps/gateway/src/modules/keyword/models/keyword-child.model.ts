import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

import { Keyword } from './keyword.model';

export type KeywordDocument = Keyword & Document;

@Schema()
export class KeywordChild {
  @Prop({ type: SchemaTypes.Mixed })
  _id: string;

  @Prop({ required: true })
  name: string;
}

export const KeywordChildSchema = SchemaFactory.createForClass(KeywordChild);
