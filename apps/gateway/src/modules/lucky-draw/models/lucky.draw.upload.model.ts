import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {SchemaTypes, Types} from 'mongoose';
import {Account} from "@/account/models/account.model";
import {Type} from "class-transformer";
export type LuckyDrawUploadDocument = LuckyDrawUploadModel & Document;

@Schema({
  collection: 'lucky_draw_upload',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class LuckyDrawUploadModel {
  @Prop({ type: SchemaTypes.String })
  file_name: string;

  @Prop({ type: SchemaTypes.String })
  path: string;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({
    type: Types.ObjectId,
    ref: Account.name,
    required: false,
  })

  @Prop({ type: SchemaTypes.ObjectId })
  account?: Types.ObjectId;

}

export const LuckyDrawUploadSchema =
  SchemaFactory.createForClass(LuckyDrawUploadModel);
