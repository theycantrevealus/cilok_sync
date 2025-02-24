// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Type } from 'class-transformer';
// import { Document, SchemaTypes, Types } from 'mongoose';
// import { Account } from '@/account/models/account.model';
// import { Merchant } from '@/merchant/models/merchant.model';
// import { Channel } from '../../channel/models/channel.model';
// import { CustomerTier } from '../../customer/models/customer.tier.model';
// import { Lov } from '../../lov/models/lov.model';
// export type KeywordDocument = Keyword & Document;

// @Schema()
// export class Keyword {
//   @Prop({ type: SchemaTypes.String, maxlength: 16, trim: true })
//   name: string;

//   @Prop({ type: SchemaTypes.Date })
//   start_period: Date;

//   @Prop({ type: SchemaTypes.Date })
//   end_period: Date;

//   @Prop({ type: Types.ObjectId, ref: Lov.name })
//   @Type(() => Lov)
//   point_type: Lov[];

//   @Prop({ type: SchemaTypes.String })
//   point_value: string;

//   @Prop({ type: SchemaTypes.Boolean })
//   for_new_redeemer: boolean;

//   @Prop({ type: SchemaTypes.String })
//   max_mode: string;

//   @Prop({ type: SchemaTypes.Number })
//   max_redeem_counter: number;

//   @Prop({ type: SchemaTypes.Number })
//   max_redeem_per_msisdn: number;

//   @Prop({ type: Types.ObjectId, ref: Channel.name })
//   @Type(() => Channel)
//   channel_validation: Channel[];

//   @Prop({ type: SchemaTypes.Boolean })
//   merchandise_keyword: boolean;

//   @Prop({ type: Types.ObjectId, ref: Merchant.name })
//   @Type(() => Merchant)
//   merchant: Merchant;

//   @Prop({ type: SchemaTypes.String })
//   merchant_name: string;

//   @Prop({ type: SchemaTypes.Boolean })
//   telkomsel_los: boolean;

//   @Prop({ type: SchemaTypes.String })
//   telkomsel_los_type: string;

//   @Prop({ type: SchemaTypes.String })
//   telkomsel_los_operator: string;

//   @Prop({ type: SchemaTypes.Number })
//   telkomsel_los_value: number;

//   @Prop({ type: SchemaTypes.Number })
//   telkomsel_los_range_min: number;

//   @Prop({ type: SchemaTypes.Number })
//   telkomsel_los_range_max: number;

//   @Prop({ type: SchemaTypes.Boolean })
//   enable_coorporate: boolean;

//   @Prop({ type: Types.ObjectId, ref: CustomerTier.name })
//   @Type(() => CustomerTier)
//   customer_tier: CustomerTier[];

//   @Prop({ type: SchemaTypes.String })
//   comment_approval: string;

//   @Prop({ type: Types.ObjectId, ref: Account.name })
//   @Type(() => Account)
//   created_by: any;

//   @Prop({ type: SchemaTypes.Date, default: Date.now() })
//   created_at: Date;

//   @Prop({ type: SchemaTypes.Date, default: Date.now() })
//   updated_at: Date;

//   @Prop({ type: SchemaTypes.Mixed, default: null })
//   deleted_at: Date | null;

//   constructor(
//     name?: string,
//     start_period?: Date,
//     end_period?: Date,
//     point_value?: string,
//     max_redeem_per_msisdn?: number,
//     channel_validation?: Channel[],
//     telkomsel_los?: boolean,
//     telkomsel_los_type?: string,
//     telkomsel_los_operator?: string,
//     telkomsel_los_range_max?: number,
//     telkomsel_los_range_min?: number,
//     telkomsel_los_value?: number,
//     enable_coorporate?: boolean,
//     customer_tier?: CustomerTier[],
//     point_type?: Lov[],
//     comment_approval?: string,
//   ) {
//     this.name = name;
//     this.start_period = start_period;
//     this.end_period = end_period;
//     this.point_value = point_value;
//     this.max_redeem_per_msisdn = max_redeem_per_msisdn;
//     this.channel_validation = channel_validation;
//     this.telkomsel_los = telkomsel_los;
//     this.telkomsel_los_type = telkomsel_los_type;
//     this.telkomsel_los_operator = telkomsel_los_operator;
//     this.telkomsel_los_value = telkomsel_los_value;
//     this.telkomsel_los_range_max = telkomsel_los_range_max;
//     this.telkomsel_los_range_min = telkomsel_los_range_min;
//     this.enable_coorporate = enable_coorporate;
//     this.customer_tier = customer_tier;
//     this.point_type = point_type;
//     this.comment_approval = comment_approval;
//   }
// }

// export const KeywordSchema = SchemaFactory.createForClass(Keyword);
