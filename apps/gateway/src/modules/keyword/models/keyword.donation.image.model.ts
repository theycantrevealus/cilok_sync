import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { KeywordDonation } from './keyword.donation.model';
export type KeywordDonationImageDocument = KeywordDonationImage & Document;

@Schema()
export class KeywordDonationImage {
  @Prop({ type: Types.ObjectId, ref: KeywordDonation.name })
  @Type(() => KeywordDonation)
  keyword: KeywordDonation;

  @Prop({ type: SchemaTypes.String })
  donation_image: string;

  @Prop({ type: SchemaTypes.String })
  donation_image_name: string;

  constructor(donation_image?: string, donation_image_name?: string) {
    this.donation_image = donation_image;
    this.donation_image_name = donation_image_name;
  }
}

export const KeywordDonationImageSchema =
  SchemaFactory.createForClass(KeywordDonationImage);
