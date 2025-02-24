import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {SchemaTypes, Types} from 'mongoose';
import {Account} from "@/account/models/account.model";
import {Type} from "class-transformer";

export type LuckyDrawUploadDetailDocument = LuckyDrawUploadDetailModel & Document;

@Schema({
  collection: 'lucky_draw_upload_detail',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class LuckyDrawUploadDetailModel {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  trace_id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  prize: string;

  @Prop({ type: SchemaTypes.String })
  path: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  account: Types.ObjectId;



}

export const LuckyDrawUploadDetailSchema =
  SchemaFactory.createForClass(LuckyDrawUploadDetailModel);
