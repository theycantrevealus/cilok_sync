import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Program } from '@/program/models/program.model';

export type RedeemModelDocument = RedeemModel & Document;

@Schema()
export class RedeemModel {
  @Prop({ type: SchemaTypes.String })
  locale: string;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  keyword_redeem: string;

  @Prop({ type: SchemaTypes.Number })
  total_redeem: number;
}

export const RedeemModelSchema = SchemaFactory.createForClass(RedeemModel);
