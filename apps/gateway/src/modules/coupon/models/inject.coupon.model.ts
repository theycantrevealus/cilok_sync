import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Min } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type InjectCouponDocument = InjectCoupon & Document;

@Schema()
export class InjectCoupon {
  @ApiProperty({
    type: String,
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String, default: 'id-ID' })
  locale: string;

  @ApiProperty({
    type: String,
    example: '',
    description: 'Subscriber Number. Format : 68xxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @ApiProperty({
    type: String,
    example: '',
    description: 'Program Id ( Need one of parameter Program Id or Keyword )',
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  program_id: string;

  @ApiProperty({
    type: String,
    example: '',
    description:
      'Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )',
  })
  @Prop({ type: SchemaTypes.String })
  keyword: string;

  @ApiProperty({
    type: Number,
    example: 1,
    minimum: 1,
    description: 'Total Coupon Will Be Redeemed',
  })
  @Min(1)
  @Prop({ type: SchemaTypes.Number, min: 1 })
  total_coupon: number;

  @ApiProperty({
    type: String,
    example: '',
    description: `True or False, <br />
      If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @Prop({ type: SchemaTypes.Boolean })
  send_notification: boolean;

  @ApiProperty({
    type: String,
    example: '',
    description: 'Channel transaction if exists ',
  })
  @Prop({ type: SchemaTypes.String })
  transaction_id: string;

  @Prop({ type: SchemaTypes.String })
  channel_id: string;

  @ApiProperty({
    type: String,
    example: '',
    description:
      'Callback url from channel, if exists, then SL will call channel based on given url',
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  callback_url: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  created_by: Account;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const InjectCouponSchema = SchemaFactory.createForClass(InjectCoupon);
