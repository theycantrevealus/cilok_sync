import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { SchemaTypes } from 'mongoose';

export type OTPDocument = OTP & Document;

@Schema({
  collection: 'otp',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class OTP {
  @Prop({ type: SchemaTypes.String, index: true })
  msisdn: string;

  @Prop({ type: SchemaTypes.String, index: true })
  otp: string;

  @Prop({ type: SchemaTypes.ObjectId, index: true })
  keyword: ObjectId;

  @Prop({ type: SchemaTypes.String })
  keyword_name: ObjectId;

  @Prop({ type: SchemaTypes.Date, default: Date.now() })
  issued_at: Date;

  @Prop({ type: SchemaTypes.Date, index: true })
  expired_at: Date;

  @Prop({ type: SchemaTypes.Date, index: true, default: null })
  claimed_at: Date;
}
export const OTPSchema = SchemaFactory.createForClass(OTP);
