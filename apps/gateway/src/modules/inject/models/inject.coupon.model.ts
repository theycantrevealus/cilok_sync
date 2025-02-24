import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Program } from '@/program/models/program.model';

export type InjectCouponModelDocument = InjectCouponModel & Document;

@Schema()
export class InjectCouponModel {
  @Prop({ type: SchemaTypes.String })
  locale: string;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.String })
  program_id: string;

  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @Prop({ type: SchemaTypes.Number })
  total_coupon: number;

  @Prop({ type: SchemaTypes.Boolean })
  @IsBoolean()
  send_notification: boolean;
}

export const InjectCouponModelSchema =
  SchemaFactory.createForClass(InjectCouponModel);
