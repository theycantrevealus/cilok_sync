import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import {
  exampleAuction,
  KeywordAuction,
} from '@/keyword/models/keyword.auction.model';
import {
  exampleDirectRedeem,
  KeywordDirectRedeem,
} from '@/keyword/models/keyword.direct.redeem.model';
import {
  exampleDiscountVoucher,
  KeywordDiscountVoucher,
} from '@/keyword/models/keyword.discount.voucher.model';
import {
  exampleDonation,
  KeywordDonation,
} from '@/keyword/models/keyword.donation.model';
import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import {
  exampleLuckyDraw,
  KeywordLuckyDraw,
} from '@/keyword/models/keyword.lucky.draw.model';
import {
  exampleMobileBanking,
  KeywordMobileBanking,
} from '@/keyword/models/keyword.mobile.banking.model';
import { KeywordNotification } from '@/keyword/models/keyword.notification.model';
import {
  exampleTelcoPost,
  KeywordTelcoPostpaid,
} from '@/keyword/models/keyword.telco.postpaid.model';
import {
  exampleTelcoPre,
  KeywordTelcoPrepaid,
} from '@/keyword/models/keyword.telco.prepaid.model';
import {
  exampleVoting,
  KeywordVoting,
} from '@/keyword/models/keyword.voting.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';

import { exampleEAuction, KeywordEAuction } from './keyword.e.auction.model';
import {
  exampleLinkaja,
  exampleLinkajaBonus,
  exampleLinkajaVoucher,
  KeywordLinkaja,
  KeywordLinkajaVoucher,
} from './keyword.linkaja.model';
import {
  exampleLoyaltyPoin,
  KeywordLoyaltyPoin,
} from './keyword.loyalty.poin.model';
import { exampleNGRS, KeywordNGRS } from './keyword.ngrs.model';
import {
  exampleSMSAuction,
  KeywordSMSAuction,
} from './keyword.sms.auction.model';
import { KeywordChild, KeywordChildSchema } from './keyword-child.model';

export type KeywordDocument = Keyword & Document;

const MAX_LENGTH = 255;

const hashtagApiProperty = {
  example: null,
  maxLength: MAX_LENGTH,
  description: '',
};

@Schema()
export class KeywordFlashSaleRC {
  @ApiProperty({
    example: false,
    description: 'Status flash sale',
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, default: false })
  status: boolean;

  @ApiProperty({
    example: '2024-05-21T13:44:00.000+07:00',
    description: 'Date of start period',
  })
  @IsOptional()
  @IsString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  start_date: Date;

  @ApiProperty({
    example: '2024-05-21T13:44:00.000+07:00',
    description: 'Date of end period',
  })
  @IsOptional()
  @IsString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  end_date: Date;

  @ApiProperty({
    example: 10,
    required: false,
    type: Number,
    description: `<p>Total POIN to be redeem for the register into an auction program. This POIN will not be refunded to customer in case customer lose the auction.</p>`,
  })
  @IsOptional()
  @IsNumber()
  @Transform((data) => parseInt(data.value))
  @Prop({
    type: SchemaTypes.Number,
    validate: [
      {
        validator: function (value: number) {
          return value >= 0;
        },
        message:
          'Invalid value for poin_redeemed. Must be a non-negative number.',
      },
    ],
  })
  poin: number;

  @ApiProperty({
    example: 10,
    required: false,
    type: Number,
    description: ``,
  })
  @IsOptional()
  @IsNumber()
  @Prop({ type: SchemaTypes.Decimal128 })
  stock: number;

  @ApiProperty({
    example: 'flash sale image',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  flashsale_image: string;

  @ApiProperty({
    example: 'flash sale description',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  flashsale_description: string;
}

@Schema()
export class KeywordRewardCatalog {
  @ApiProperty({
    example: `PROG${(Math.random() + 1)
      .toString(36)
      .substring(7)
      .toUpperCase()}`,
    maxLength: 16,
    description: `Name of program. Keyword <b>must be</b>:<br />
        <ol>
        <li>Unique</li>
        <li>Only allow alphanumeric (letter and number)</li>
        <li>Max length 16 chars</li>
        <li>No space before, after and between keyword (only single word allowed)</li>
        </ol>`,
  })
  @Matches(/^\w+$/)
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String, maxlength: 16, trim: true })
  program: string;

  @ApiProperty({
    example: `KEY${(Math.random() + 1)
      .toString(36)
      .substring(7)
      .toUpperCase()}`,
    maxLength: 16,
    description: `Name of program. Keyword <b>must be</b>:<br />
        <ol>
        <li>Unique</li>
        <li>Only allow alphanumeric (letter and number)</li>
        <li>Max length 16 chars</li>
        <li>No space before, after and between keyword (only single word allowed)</li>
        </ol>`,
  })
  @Matches(/^\w+$/)
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String, maxlength: 16, trim: true })
  keyword: string;

  @ApiProperty({
    example: null,
    description: `Keyword Type`,
  })
  @IsString()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  keyword_type: string;

  @ApiProperty({
    ...hashtagApiProperty,
    description: `First hashtag`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  hashtag_1: string;

  @ApiProperty({
    ...hashtagApiProperty,
    description: `Second hashtag`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  hashtag_2: string;

  @ApiProperty({
    ...hashtagApiProperty,
    description: `Third hashtag`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  hashtag_3: string;

  @ApiProperty({
    example: ['DIAMOND', 'GOLD', 'PLATINUM', 'SILVER'],
    description: 'array of string convert to string',
  })
  @IsArray()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.Array })
  catalog_type: string[];

  @ApiProperty({
    example: ['DIAMOND', 'GOLD', 'PLATINUM', 'SILVER'],
    description: 'array of string convert to string',
  })
  @IsArray()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.Array })
  catalog_display: string[];

  @ApiProperty({
    example: `2022-12-29`,
    description: `Date of start period`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  start_period: string;

  @ApiProperty({
    example: `2022-12-29`,
    description: `Date of end period`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  end_period: string;

  @ApiProperty({
    example: 10,
    required: false,
    type: Number,
    description: `<p>Total POIN to be redeem for the register into an auction program. This POIN will not be refunded to customer in case customer lose the auction.</p>`,
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.Number })
  point_keyword: number;

  @ApiProperty({
    example: 100,
    required: true,
    type: Number,
    description: `The POIN markup display.`,
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number })
  poin_markup_display: number;

  @ApiProperty({
    example: ['kartuAS', 'kartuHALO', 'simPATI'],
    required: false,
    type: [String],
    description: `The entity applied on.`,
  })
  @IsArray()
  @IsOptional()
  @Prop({ type: [String] })
  applied_on: string[];

  @ApiProperty({
    example: ['kartuAS', 'kartuHALO', 'simPATI'],
    required: false,
    type: [String],
    description: `The special applied on.`,
  })
  @IsArray()
  @IsNotEmpty()
  @Prop({ required: false, type: [String] })
  special_applied_on: string[];

  @ApiProperty({
    example: ['Web', 'Mobile'],
    required: false,
    type: [String],
    description: `The channel.`,
  })
  @IsNotEmpty()
  @IsArray()
  @Prop({ required: false, type: [String] })
  channel: string[];

  @ApiProperty({
    example: 'Both',
    required: false,
    type: String,
    description: `Flag to indicate whether this is enabled for corporate subscribers.`,
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  enable_for_corporate_subs: string;

  @ApiProperty({
    example: '2022-03-15',
    required: true,
    type: String,
    description: `The effective date.`,
  })
  @IsNotEmpty()
  @IsDateString()
  @Prop({ type: SchemaTypes.String })
  effective: string;

  @ApiProperty({
    example: '2022-04-15',
    required: true,
    type: String,
    description: `The expiry date.`,
  })
  @IsNotEmpty()
  @IsDateString()
  @Prop({ type: SchemaTypes.String })
  to: string;

  @ApiProperty({
    example: ['microsite-segment-1', 'microsite-segment-2'],
    required: false,
    type: String,
    description: `The microsite segment.`,
  })
  @IsOptional()
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  microsite_segment: string[];

  @ApiProperty({
    example: 'Product title',
    required: true,
    type: String,
    description: `The title.`,
  })
  @IsNotEmpty()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  title: string;

  @ApiProperty({
    example: 'Product teaser',
    required: true,
    type: String,
    description: `The teaser.`,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  teaser: string;

  @ApiProperty({
    example: 'Product teaser EN',
    required: true,
    type: String,
    description: `The English teaser.`,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  teaser_en: string;

  @ApiProperty({
    example: 'Product description',
    required: true,
    type: String,
    description: `The description.`,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  description: string;

  @ApiProperty({
    example: 'Product description EN',
    required: true,
    type: String,
    description: `The English description.`,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  description_en: string;

  @ApiProperty({
    example: 'Frequently Asked Questions',
    description: 'FAQ in the local language',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  faq: string;

  @ApiProperty({
    example: 'Frequently Asked Questions',
    description: 'FAQ in English',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  faq_en: string;

  @ApiProperty({
    example: 'https://example.com/promo.jpg',
    description: 'Promotional image URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_promo_loc: string;

  @ApiProperty({
    example: 'https://example.com/detail.jpg',
    description: 'Detail image URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_detail_loc: string;

  @ApiProperty({
    example: 'https://example.com/detail1.jpg',
    description: 'Detail image URL 1',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_detail_1_loc: string;

  @ApiProperty({
    example: 'https://example.com/detail2.jpg',
    description: 'Detail image URL 2',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_detail_2_loc: string;

  @ApiProperty({
    example: 'https://example.com/detail3.jpg',
    description: 'Detail image URL 3',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_detail_3_loc: string;

  @ApiProperty({
    example: 'https://example.com/small.jpg',
    description: 'Small image URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_small: string;

  @ApiProperty({
    example: 'https://example.com/medium.jpg',
    description: 'Medium image URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_medium: string;

  @ApiProperty({
    example: 'https://example.com/large.jpg',
    description: 'Large image URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  image_large: string;

  @ApiProperty({
    example: ['Sumatra Utara', 'Jawa Timur'],
    description: 'List of cities',
  })
  @IsOptional()
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  province: string[];

  @ApiProperty({
    example: ['Medan', 'Surabaya'],
    description: 'List of cities',
  })
  @IsOptional()
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  city: string[];

  @ApiProperty({
    example: 'Redeem your points at our store',
    description: 'Instructions on how to redeem points in the local language',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  how_to_redeem: string;

  @ApiProperty({
    example: 'Redeem your points at our store',
    description: 'Instructions on how to redeem points in English',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  how_to_redeem_en: string;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Promotional video URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  video: string;

  @ApiProperty({
    example: 'https://maps.google.com/...',
    description: 'Google Maps URL',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  google_maps: string;

  @ApiProperty({
    example: true,
    description: 'Indicates whether this is a hot promo or not',
  })
  @IsOptional()
  @IsBoolean()
  @Prop({ type: SchemaTypes.String })
  hot_promo: boolean;

  @ApiProperty({
    example: 'Electronics',
    description: 'Category of the promo',
  })
  @IsNotEmpty()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  category: string;

  @ApiProperty({
    example: '59799',
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  merchant_id: string;

  @ApiProperty({
    example: '19-NOV-21',
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  created_at: string;

  @ApiProperty({
    example: '19-NOV-21',
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  updated_at: string;

  @ApiProperty({
    example: '99582',
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  stock: string;

  @ApiProperty({
    example: 'Link Aja Voucher Title',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String, default: null })
  link_aja_voucher_title: string;

  @ApiProperty({
    example: 'Link Aja Voucher Description',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String, default: null })
  link_aja_voucher_description: string;

  @ApiProperty({
    example: 10,
    required: true,
    type: Number,
    description: `The Link Aja Poin.`,
  })
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number, default: 0 })
  link_aja_voucher_poin_price: number;

  @ApiProperty({
    example: 'Link Aja Voucher Image',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String, default: null })
  link_aja_voucher_banner_image: string;

  @ApiProperty({
    example: 'Link Aja Voucher Image',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String, default: null })
  flash_sale_banner_image: string;

  @ApiProperty({
    example: '500',
    description: '',
  })
  @IsOptional()
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  voting_target_redeemer: number;

  @ApiProperty({
    type: Object,
    isArray: true,
    required: false,
    description: 'Voting options',
    example: [
      {
        option: 'Option A',
        image: 'https://example.com/voting/option_a.jpg',
      },
    ],
  })
  @Transform((data) => {
    const dataSet = [];
    if (data.value) {
      if (data.value.constructor === Array) {
        data.value.map((e) => {
          if (Object.keys(e).length !== 0) {
            dataSet.push(e);
          }
        });
        return dataSet;
      } else {
        return [];
      }
    } else {
      return [];
    }
  })
  @IsOptional()
  voting_options: object[];

  @ApiProperty({
    type: String,
    example: '62ffc1d68a01008799e785cb',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_point_type">Data Source</a><br />
    Multi selection should be enabled`,
  })
  @IsOptional()
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  banefit_category: Lov;

  @ApiProperty({
    example: 99582,
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.Number })
  price_info: number;

  @ApiProperty({
    example: 'https://telkomsel.co.id',
    description: '',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  url_merchant: string;

  @ApiProperty({
    type: KeywordFlashSaleRC,
    description: 'Flashsale',
  })
  @IsOptional()
  @Prop({ type: KeywordFlashSaleRC, default: {} })
  flashsale: KeywordFlashSaleRC;

  @ApiProperty({
    example: ['Sumatra Utara', 'Jawa Timur'],
    description: 'List of cities',
  })
  @IsOptional()
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  area: string[];

  @ApiProperty({
    example: ['Medan', 'Surabaya'],
    description: 'List of cities',
  })
  @IsOptional()
  @IsArray()
  @Prop({ type: SchemaTypes.Array })
  region: string[];

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    type: Location,
    required: false,
    description: '',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_type: Location;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    type: Location,
    required: false,
    description: '',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_area_identifier: Location;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    type: Location,
    required: false,
    description: '',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location_region_identifier: Location;

  constructor(
    catalog_type?: string[],
    catalog_display?: string[],
    link_aja_voucher_title?: string,
    link_aja_voucher_description?: string,
    link_aja_voucher_poin_price?: number,
    link_aja_voucher_banner_image?: string,
    flash_sale_banner_image?: string,
    banefit_category?: Lov,
    flashsale?: KeywordFlashSaleRC,
    area?: string[],
    region?: string[],
    location_type?: Location,
    location_area_identifier?: Location,
    location_region_identifier?: Location,
  ) {
    (this.catalog_type = catalog_type),
      (this.catalog_display = catalog_display),
      (this.link_aja_voucher_title = link_aja_voucher_title),
      (this.link_aja_voucher_description = link_aja_voucher_description),
      (this.link_aja_voucher_poin_price = link_aja_voucher_poin_price),
      (this.link_aja_voucher_banner_image = link_aja_voucher_banner_image),
      (this.flash_sale_banner_image = flash_sale_banner_image),
      (this.banefit_category = banefit_category);
    this.flashsale = flashsale;
    this.area = area;
    this.region = region;
    this.location_type = location_type;
    this.location_area_identifier = location_area_identifier;
    this.location_region_identifier = location_region_identifier;
  }
}

@Schema()
export class Keyword {
  @ApiProperty({
    type: KeywordRewardCatalog,
    required: false,
    description: 'Reward Catalog',
  })
  @IsOptional()
  @Prop({ type: Types.ObjectId, ref: KeywordRewardCatalog.name })
  @Type(() => KeywordRewardCatalog)
  reward_catalog: KeywordRewardCatalog;

  @ApiProperty({
    type: KeywordEligibility,
    required: true,
    description: 'Eligibility',
  })
  @Prop({ type: Types.ObjectId, ref: KeywordEligibility.name })
  @Type(() => KeywordEligibility)
  @ValidateNested()
  eligibility: KeywordEligibility;

  @ApiProperty({
    // isArray: true,
    type: Array<
      | KeywordLuckyDraw
      | KeywordAuction
      | KeywordTelcoPostpaid
      | KeywordTelcoPrepaid
      | KeywordVoting
      | KeywordDonation
      | KeywordMobileBanking
      | KeywordLinkaja
      | KeywordNGRS
      | KeywordDirectRedeem
      | KeywordDiscountVoucher
      | KeywordLinkajaVoucher
      | KeywordEAuction
      | KeywordSMSAuction
    >,
    example: [
      { bonus_type: 'telco_postpaid', ...exampleTelcoPost },
      { bonus_type: 'telco_prepaid', ...exampleTelcoPre },
      { bonus_type: 'loyalty_poin', ...exampleLoyaltyPoin },
      { bonus_type: 'lucky_draw', ...exampleLuckyDraw },
      { bonus_type: 'auction', ...exampleAuction },
      { bonus_type: 'voting', ...exampleVoting },
      { bonus_type: 'donation', ...exampleDonation },
      { bonus_type: 'mbp', ...exampleMobileBanking },
      { bonus_type: 'linkaja_main', ...exampleLinkaja },
      { bonus_type: 'linkaja_bonus', ...exampleLinkajaBonus },
      { bonus_type: 'linkaja_voucher', ...exampleLinkajaVoucher },
      { bonus_type: 'direct_redeem', ...exampleDirectRedeem },
      { bonus_type: 'discount_voucher', ...exampleDiscountVoucher },
      { bonus_type: 'ngrs', ...exampleNGRS },
      { bonus_type: 'linkaja_voucher', ...exampleLinkajaVoucher },
      { bonus_type: 'e_auction', ...exampleEAuction },
      { bonus_type: 'sms_auction', ...exampleSMSAuction },
    ],
    description: 'For string input checker',
  })
  @Prop({ type: SchemaTypes.Mixed })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Transform(({ value }) =>
    value?.map((o) => {
      switch (o.bonus_type) {
        case 'auction':
          return plainToInstance(KeywordAuction, o);
          break;
        case 'telco_postpaid':
          return plainToInstance(KeywordTelcoPostpaid, o);
          break;
        case 'telco_prepaid':
          return plainToInstance(KeywordTelcoPrepaid, o);
          break;
        case 'loyalty_poin':
          return plainToInstance(KeywordLoyaltyPoin, o);
          break;
        case 'voting':
          return plainToInstance(KeywordVoting, o);
          break;
        case 'donation':
          return plainToInstance(KeywordDonation, o);
          break;
        case 'mbp':
          return plainToInstance(KeywordMobileBanking, o);
          break;
        case 'linkaja_main':
          return plainToInstance(KeywordLinkaja, o);
          break;
        case 'linkaja_bonus':
          return plainToInstance(KeywordLinkaja, o);
          break;
        case 'ngrs':
          return plainToInstance(KeywordNGRS, o);
          break;
        case 'direct_redeem':
          return plainToInstance(KeywordDirectRedeem, o);
          break;
        case 'discount_voucher':
          return plainToInstance(KeywordDiscountVoucher, o);
          break;
        case 'linkaja_voucher':
          return plainToInstance(KeywordLinkajaVoucher, o);
          break;
        case 'e_auction':
          return plainToInstance(KeywordEAuction, o);
          break;
        case 'sms_auction':
          return plainToInstance(KeywordSMSAuction, o);
          break;
        default:
          return plainToInstance(KeywordLuckyDraw, o);
      }
    }),
  )
  bonus: Array<
    | KeywordLuckyDraw
    | KeywordAuction
    | KeywordTelcoPostpaid
    | KeywordTelcoPrepaid
    | KeywordVoting
    | KeywordDonation
    | KeywordMobileBanking
    | KeywordLinkaja
    | KeywordNGRS
    | KeywordDirectRedeem
    | KeywordDiscountVoucher
    | KeywordEAuction
    | KeywordSMSAuction
  >;

  @ApiProperty({
    type: KeywordNotification,
    isArray: true,
    required: false,
    description: 'Keyword notification formation',
  })
  @Prop({ type: Types.ObjectId, ref: 'KeywordNotification' })
  @Type(() => KeywordNotification)
  @ValidateNested({ each: true })
  @IsNotEmpty()
  notification: KeywordNotification[];

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
  })
  @Type(() => Lov)
  keyword_approval: Lov;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  hq_approver: Account | null;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  non_hq_approver: Account | null;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  is_draft: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  is_stoped: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  need_review_after_edit: boolean;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Keyword.name,
    default: null,
  })
  @Type(() => Keyword)
  keyword_edit: Keyword;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: true,
  })
  @Type(() => Account)
  created_by: Account | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @ApiProperty({
    example: true,
    required: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ required: true, type: SchemaTypes.Boolean, default: true })
  is_main_keyword: boolean;

  @Prop({ type: SchemaTypes.Mixed, default: [] })
  @IsArray()
  child_keyword: KeywordChild[];

  constructor(
    reward_catalog?: KeywordRewardCatalog,
    eligibility?: KeywordEligibility,
    notification?: KeywordNotification[],
    created_by?: Account | null,
    is_draft?: boolean,
    keyword_approval?: Lov,
    is_main_keyword?: boolean,
    child_keyword?: KeywordChild[],
  ) {
    this.reward_catalog = reward_catalog;
    this.eligibility = eligibility;
    this.notification = notification;
    this.created_by = created_by;
    this.is_draft = is_draft;
    this.keyword_approval = keyword_approval;
    this.is_main_keyword = is_main_keyword;
    this.child_keyword = child_keyword;
  }
}

export const KeywordSchema = SchemaFactory.createForClass(Keyword);

KeywordSchema.index({ 'child_keyword._id': 1 }); // Create index on _id field of child_keyword array
