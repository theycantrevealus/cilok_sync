import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';
import { number, string } from 'yargs';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Channel } from '@/channel/models/channel.model';
import { CustomerBadge } from '@/customer/models/customer.badge.model';
import { CustomerBrand } from '@/customer/models/customer.brand.model';
import { CustomerTier } from '@/customer/models/customer.tier.model';
import { KeywordShiftAddDTO } from '@/keyword/dto/keyword.shift.add.dto';
import { KeywordShift } from '@/keyword/models/keyword.shift.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';
import { Merchant } from '@/merchant/models/merchant.model';
import { ProgramV2 } from '@/program/models/program.model.v2';

import {
  KeywordFlashSaleEligibility,
  KeywordFlashSaleEligibilitySchema,
} from './keyword-flash-sale-eligibility.model';

export type KeywordEligibilityDocument = KeywordEligibility & Document;

@Schema()
export class KeywordProgramShift {
  @ApiProperty({
    example: '00:00',
    description: 'Start shift time',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  from: string;

  @ApiProperty({
    example: '13:00',
    description: 'End shift time',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  to: string;

  constructor(from?: string, to?: string) {
    this.from = from;
    this.to = to;
  }
}

@Schema()
export class ProgramShift {
  @ApiProperty({
    example: '00:00',
    description: 'Start shift time',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  from: string;

  @ApiProperty({
    example: '13:00',
    description: 'End shift time',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  to: string;

  constructor(from?: string, to?: string) {
    this.from = from;
    this.to = to;
  }
}

@Schema()
export class KeywordMaxRedeemTreshold {
  @ApiProperty({
    example: false,
    description: 'Status max redeem treshold',
  })
  @IsOptional()
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, default: false })
  status: boolean;

  @ApiProperty({
    example: 'MONTHLY',
    description: 'Type max redeem treshold',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  type: string;

  @ApiProperty({
    example: ['11', '15'],
    description: 'Date max redeem treshold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString({ each: true })
  @Prop({ type: [SchemaTypes.String], default: [] })
  date: string[];

  @ApiProperty({
    example: ['01', '17'],
    description: 'Time max redeem treshold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString({ each: true })
  @Prop({ type: [SchemaTypes.String], default: [] })
  time: string[];
}

@Schema()
export class KeywordEligibility {
  @ApiProperty({
    example: `KEY${(Math.random() + 1)
      .toString(36)
      .substring(7)
      .toUpperCase()}`,
    maxLength: 16,
    description: `Name of keyword. Keyword <b>must be</b>:<br />
        <ol>
        <li>Unique</li>
        <li>Only allow alphanumeric (letter, number, and optional hyphen)</li>
        <li>Max length 16 chars</li>
        <li>No space before, after and between keyword (only single word allowed)</li>
        </ol>`,
  })
  @Matches(/^[\w-]*$/)
  @Prop({ type: SchemaTypes.String, maxlength: 16, trim: true, unique: true })
  name: string;

  @ApiProperty({
    example: '2022-10-01',
    description: 'Date of start period',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  start_period: Date;

  @ApiProperty({
    example: '2022-12-29',
    description: 'Date of end period',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  end_period: Date;

  @ApiProperty({
    type: String,
    required: false,
    example: '63063d4055d5193fcac95fe9',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_keyword_type">Data Source</a><br />
    Related One Keyword with multiple product/benefits.`,
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  keyword_type: string;

  @ApiProperty({
    type: String,
    example: '62ffc1d68a01008799e785cb',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_point_type">Data Source</a><br />
    Multi selection should be enabled`,
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  point_type: Lov;

  @ApiProperty({
    enum: ['Fixed', 'Flexible', 'Fixed-Multiple'],
    example: 'Fixed',
    description: `Value POIN:
    <ol>
    <li>Fixed</li>
    <li>Flexible</li>
    <li>Fixed-Multiple</li>
    </ol>
    <p>Fixed: Fixed poin per redeem.<br />
    Flexible: customer can specify total poin per redeem i.e for program related to donation, lucky draw etc.</p>`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  poin_value: string;

  @ApiProperty({
    example: 10,
    required: false,
    type: Number,
    description: `<p>Total POIN to be redeem for the register into an auction program. This POIN will not be refunded to customer in case customer lose the auction.</p>`,
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
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
  poin_redeemed: number;

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
    description: 'If true, it will apply channel validation logic.',
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  channel_validation: boolean;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Location Management/LocationController_index">Data Source</a><br />List of channels.<br />Defining location will grant access for each of them to modify current keyword based on their role's privileges.<br />
    Front End : Need to show ID & Name. Ex : ID001 - Channel Name<br />
    Customer Channel, including but not limited to:
    <ul>
    <li>Web Channel</li>
    <li>SMS</li>
    <li>UMB</li>
    <li>External 3rd Party App Channel, e.g. Virtual Assistant, MyTelkomsel, Maxstream Microsite; MyTelkomsel Web; MyTelkomsel Mobile;</li>
    </ul>
    For example only:<br />
    62fc05f14d1108a027cbe148<br />
    62fe83c3e858380ef4677eb6`,
    type: [String],
    example: ['62fc05f14d1108a027cbe148', '62fe83c3e858380ef4677eb6'],
  })
  @IsArray()
  @Type(() => Channel)
  @Prop({ type: [{ type: Types.ObjectId, ref: Channel.name }] })
  channel_validation_list: Channel[];
  channel_validation_list_info: Channel[];

  //======================================================================================================================================================================

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    type: ProgramV2,
    required: false,
    description: '',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: ProgramV2.name })
  @Type(() => ProgramV2)
  program_id: ProgramV2;

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  eligibility_locations: boolean;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Channel Management/ChannelController_index">Data Source</a><br />List of locations.<br />
    For example only:<br />
    62ffd9ed1e38fbdeb16f1f53<br />
    62ffdb621e38fbdeb16f1f5d`,
    type: [String],
    example: ['62ffd9ed1e38fbdeb16f1f53', '62ffdb621e38fbdeb16f1f5d'],
  })
  @IsArray()
  @Type(() => Channel)
  @Prop({ type: [{ type: Types.ObjectId, ref: Location.name }] })
  locations: Location[];

  @ApiProperty({
    example: 'Program Name to be Exposed',
    description: 'Program name to be exposed',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  program_title_expose: string;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Customer Management/CustomerController_get_badge">Data Source</a>
    <br />
    List of multiple<br />
    For example only:<br />
    63064c46c02a4b68ca44ec85<br />
    63064c52c02a4b68ca44ec93`,
    type: [String],
    example: ['63064c46c02a4b68ca44ec85', '63064c52c02a4b68ca44ec93'],
  })
  @IsString({ each: true })
  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Transform((dataSet) => {
    if (dataSet) {
      const target = dataSet.value.toString();
      return target.split(',');
    } else {
      return [];
    }
  })
  program_experience: string[];

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  program_bersubsidi: boolean;

  //======================================================================================================================================================================

  @ApiProperty({
    example: '630245cd53b5ef1a0e16c216',
    required: false,
    description:
      '<a target="_blank" rel="noopener noreferrer" href="#/Merchant Management/MerchantController_index">Data Source</a><br />Select Merchant from available list',
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Merchant.name })
  merchant: string;

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
    description: `Allow merchandise`,
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  merchandise_keyword: boolean;

  @ApiProperty({
    example: 'Day',
    enum: ['Day', 'Shift'],
    description: `<ul>
    <li>Day (Program will run within certain period and cannot be divided into some scheduled period)</li>
    <li>Shift (Program will run within certain period which is able to be divided/split into some scheduled period)</li>
    </ul>`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  keyword_schedule: string;

  @ApiProperty({
    type: Number,
    multipleOf: 0.001,
    required: false,
    example: 300.33,
    description: 'For information only',
  })
  @Transform((data) => parseFloat(data.value))
  @IsNumber()
  @Prop({
    type: SchemaTypes.Decimal128,
    validate: [
      {
        validator: function (value: number) {
          return value >= 0;
        },
        message:
          'Invalid value for total_budget. Must be a non-negative number.',
      },
    ],
  })
  total_budget: number;

  @ApiProperty({
    type: 'number',
    multipleOf: 0.001,
    required: false,
    example: 110.333,
    description: 'For information only',
  })
  @Transform((data) => parseFloat(data.value))
  @IsNumber()
  @Prop({
    type: SchemaTypes.Decimal128,
    validate: [
      {
        validator: function (value: number) {
          return value >= 0;
        },
        message:
          'Invalid value for customer_value. Must be a non-negative number.',
      },
    ],
  })
  customer_value: number;

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
    description: `Multiwhitelist is capability to make customer eligible to redeem other offer after succesfully redeem certain keywords.<br />
    Multiwhitelist mechanism by insert redeem whitelist eligibility by trigger (API, flat file) for event specific reward redemption.<br />
    Redeem based on files from surrounding.`,
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  multiwhitelist: boolean;

  @ApiProperty({
    type: [String],
    description: `A <a target="_blank" rel="noopener noreferrer" href="#/Program Management/ProgramControllerV2_getProgram">program</a> that will affected to whilist injection`,
    example: ['639bdf0956f06b7b3376680d', '63beb63c390a5427930367bb'],
  })
  @IsArray()
  @Type(() => ProgramV2)
  @Prop({ type: Types.ObjectId, ref: ProgramV2.name })
  multiwhitelist_program: ProgramV2[];

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
    description: `<ol>
    <li>If enabled, setting value will be at GUI merchant.</li>
    <li>If disabled, Default SMS Masking: 777</li>`,
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  enable_sms_masking: boolean;

  @ApiProperty({
    required: false,
    description: `Masking content`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  sms_masking: string;

  @ApiProperty({
    enum: ['General', 'WIB', 'WITA', 'WIT'],
    example: 'General',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  timezone: string;

  @ApiProperty({
    type: Boolean,
    example: 'true',
    enum: [false, true],
    description: 'For new redeemer?',
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: true })
  for_new_redeemer: boolean;

  @ApiProperty({
    example: 'Day',
    enum: ['Day', 'Month', 'Year', 'Shift', 'Program'],
    description: `<ul>
    <li>Day (To define redeem counter daily)</li>
    <li>Month (To define redeem counter monthly)</li>
    <li>Year (To define redeem counter yearly)</li>
    <li>Program (To define redeem counter per program)</li>
    <li>Shift in Daily(Shift to define redeem counter for each shift/schedule time every day)</li>
    </ul>`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  max_mode: string;

  @ApiProperty({
    type: Number,
    example: 20,
    description:
      'How many time(s) customer can redeem in <b>max_mode</b> config',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  max_redeem_counter: number;

  //======================================================================================================================================================================

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Customer Management/CustomerController_get_tier">Data Source</a>
    <br />
    List of multiple<br />
    For example only:<br />
    6302467853b5ef1a0e1744c4<br />
    6302467c53b5ef1a0e1744d2`,
    type: [String],
    example: ['6302467853b5ef1a0e1744c4', '6302467c53b5ef1a0e1744d2'],
  })
  // @IsString({ each: true })
  // @Transform((dataSet) => {
  //   if (dataSet) {
  //     const target = dataSet.value.toString();
  //     return target.split(',');
  //   } else {
  //     return [];
  //   }
  // })
  @IsArray()
  @Type(() => CustomerTier)
  @Prop({ type: Types.ObjectId, ref: CustomerTier.name })
  segmentation_customer_tier: CustomerTier[];

  @ApiProperty({
    enum: [
      'LessThan',
      'LessOrEqualTo',
      'EqualTo',
      'MoreThan',
      'MoreOrEqualTo',
      'Ranged',
    ],
    example: 'LessThan',
    description: '',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_los_operator: string;

  @ApiProperty({
    type: Number,
    example: 10,
    description: 'According to selected LOS Operator. Ex: LessThan (10)',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_los: number;

  @ApiProperty({
    type: Number,
    example: 10,
    description:
      'Minimum Value. Only defined if the selected LOS Operator is Ranged',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_los_max: number;

  @ApiProperty({
    type: Number,
    example: 40,
    description:
      'Maximum Value. Only defined if the selected LOS Operator is Ranged',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_los_min: number;

  @ApiProperty({
    example: 'Regular',
    enum: ['Regular', 'Corporate'],
    description: '<b class="concern">Still need discuss</b>',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_type: string;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Customer Management/CustomerController_get_badge">Data Source</a>
    <br />
    List of multiple<br />
    For example only:<br />
    63064c46c02a4b68ca44ec85<br />
    63064c52c02a4b68ca44ec93`,
    example: ['63064c46c02a4b68ca44ec85', '63064c52c02a4b68ca44ec93'],
  })
  // @IsString({ each: true })
  // @Transform((dataSet) => {
  //   if (dataSet) {
  //     const target = dataSet.value.toString();
  //     return target.split(',');
  //   } else {
  //     return [];
  //   }
  // })
  @IsArray()
  @Type(() => CustomerBadge)
  @Prop({ type: Types.ObjectId, ref: CustomerBadge.name })
  segmentation_customer_most_redeem: CustomerBadge[];

  @ApiProperty({
    type: [String],
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Customer Management/CustomerController_get_brand">Data Source</a>
    <br />
    List of multiple<br />
    For example only:<br />
    63064e72270937858307450d<br />
    63064e78270937858307451b`,
    example: ['63064e72270937858307450d', '63064e78270937858307451b'],
  })
  // @IsString({ each: true })
  // @Transform((dataSet) => {
  //   if (dataSet) {
  //     const target = dataSet.value.toString();
  //     return target.split(',');
  //   } else {
  //     return [];
  //   }
  // })
  @IsArray()
  @Type(() => CustomerBrand)
  @Prop({ type: Types.ObjectId, ref: CustomerBrand.name })
  segmentation_customer_brand: CustomerBrand[];
  segmentation_customer_brand_info: any;

  @ApiProperty({
    type: Boolean,
    description: '<b class="concern">Still need discuss</b>',
    example: 'false',
    enum: [false, true],
  })
  @Transform((data) => {
    const value = data.value;
    return value === 'true' || value === true || value === 1 || value === '1';
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: true })
  segmentation_customer_prepaid_registration: boolean;

  @ApiProperty({
    example: false,
    description: `<b class="concern">Still need discuss</b><br />Customer indicator for KYC Data completeness: 
    <ul>
    <li>Can be used for Eligibility checking.</li>
    <li>Can be used for Informing Customer to update KYC. Customer without complete KYC will be redirected to fill data either when joining lucky draw or after winning lucky draw.</li>
    </ul>
    <br /><br />
    <p>
    KYC Data: To be confirmed if KYC to be stored in SmileLoyalty based on data from CRM BE & BI: 
    </p>
    <ul>
    <li>CRM BE (one time reference)</li>
    <li>MSISDN</li>
    <li>Address</li>
    <li>NIK</li>
    <li>Area</li>
    <li>Province</li>
    <li>Region</li>
    <li>Branch</li>
    </ul>
    <br />
    <p>BI:</p>
    <ul>
    <li>Tier</li>
    <li>ARPU</li>
    <li>LOS</li>
    <li>App Category</li>
    <li>App Name</li>
    </ul>
    <br />
    <p>Loyalty (possible for update):</p>
    <ul>
    <li>Email</li>
    <li>Phone Number</li>
    <li>Addressc</li>
    </ul>`,
  })
  @IsBoolean()
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_kyc_completeness: boolean;

  // @ApiProperty({
  //   example: 'TESTING',
  //   description: '<b class="concern">Still need discuss</b>',
  // })
  // @IsString()
  // @Prop({ type: SchemaTypes.String })
  // segmentation_customer_city: string;

  @ApiProperty({
    enum: [
      'LessThan',
      'LessOrEqualTo',
      'EqualTo',
      'MoreThan',
      'MoreOrEqualTo',
      'Ranged',
    ],
    example: 'LessThan',
    description: '',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_poin_balance_operator: string;

  @ApiProperty({
    type: Number,
    example: 10,
    description:
      'According to selected POIN balance Operator. Ex: LessThan (10)',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_poin_balance: number;

  @ApiProperty({
    type: Number,
    example: 10,
    description:
      'Minimum Value. Only defined if the selected POIN balance Operator is Ranged',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_poin_balance_min: number;

  @ApiProperty({
    type: Number,
    example: 50,
    description:
      'Maximum Value. Only defined if the selected POIN balance Operator is Ranged',
  })
  @Transform((data) => parseInt(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Number })
  segmentation_customer_poin_balance_max: number;

  @ApiProperty({
    example: 'TESTING',
    description: '<b class="concern">Still need discuss</b>',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_preference: string;

  @ApiProperty({
    enum: [
      'LessThan',
      'LessOrEqualTo',
      'EqualTo',
      'MoreThan',
      'MoreOrEqualTo',
      'Ranged',
    ],
    example: 'LessThan',
    description: '',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_arpu_operator: string;

  @ApiProperty({
    type: Number,
    multipleOf: 0.001,
    example: 311220.412,
    description: 'According to selected APRU Operator. Ex: LessThan (10)',
  })
  @Transform((data) => parseFloat(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Decimal128 })
  segmentation_customer_arpu: number;

  @ApiProperty({
    type: Number,
    multipleOf: 0.001,
    example: 1553340.233,
    description:
      'Maximum Value. Only defined if the selected ARPU Operator is Ranged',
  })
  @Transform((data) => parseFloat(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Decimal128 })
  segmentation_customer_arpu_min: number;

  @ApiProperty({
    type: Number,
    example: 52310.333,
    multipleOf: 0.001,
    description:
      'Minimum Value. Only defined if the selected ARPU Operator is Ranged',
  })
  @Transform((data) => parseFloat(data.value))
  @IsNumber()
  @Prop({ type: SchemaTypes.Decimal128 })
  segmentation_customer_arpu_max: number;

  @ApiProperty({
    example: 'TESTING',
    description: '<b class="concern">Still need discuss</b>',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  segmentation_customer_preferences_bcp: string;

  //======================================================================================================================================================================

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'List if employees msisdn. It will prefer as upload as blacklist',
  })
  file: any;

  @ApiProperty({
    type: Boolean,
    example: true,
    description:
      'List if employees msisdn. It will prefer as upload as blacklist',
  })
  @Prop({ type: SchemaTypes.Boolean })
  segmentation_employee_numbers: boolean;

  @ApiProperty({
    type: KeywordShiftAddDTO,
    isArray: true,
    required: false,
    description: 'Shift time range if time is setted to shift',
  })
  @Transform((data) => {
    if (data.value) {
      if (data.value.constructor === String) {
        const value = data.value.toString();
        const raw = `[${value.replace(/\s|\\r/gm, '')}]`;
        const parsed = JSON.parse(raw);
        return parsed;
      } else {
        return data.value;
      }
    } else {
      return [];
    }
  })
  @IsNotEmpty()
  keyword_shift: KeywordShift[];

  @ApiProperty({
    type: Boolean,
    example: 'true',
    enum: [false, true],
    description: 'Set Location?',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: true })
  eligibility_location: boolean;

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

  @ApiProperty({
    example: 'MOBILE LEGEND',
    type: String,
    required: false,
  })
  @IsOptional()
  bcp_app_name: string;

  @ApiProperty({
    example: '891281292',
    type: String,
    required: false,
  })
  @IsOptional()
  imei: string;

  @ApiProperty({
    example: 'CONTAINS',
    type: String,
    required: false,
  })
  @IsOptional()
  bcp_app_name_operator: string;

  @ApiProperty({
    example: 'GAME KEREN',
    type: String,
    required: false,
  })
  @IsOptional()
  bcp_app_category: string;

  @ApiProperty({
    example: 'EQUALS',
    type: String,
    required: false,
  })
  @IsOptional()
  bcp_app_category_operator: string;

  @ApiProperty({
    example: 'EQUALS',
    type: String,
    required: false,
  })
  @IsOptional()
  imei_operator: string;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  created_by: any;

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
  segmentation_customer_tier_info: any;

  @ApiProperty({
    type: Boolean,
    example: 'false',
    enum: [false, true],
    description:
      'To check segmentation based on Telkomsel Employee Number values. Values in customer profile, taken from core',
  })
  @IsBoolean()
  @Type(() => Boolean)
  @Prop({ type: SchemaTypes.Boolean, default: false })
  segmentation_telkomsel_employee: any;

  @ApiProperty({
    example: 'flash sale start date',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  flash_sale_start_date: string;

  @ApiProperty({
    example: 'flash sale start date',
    description: '',
  })
  @IsString()
  @IsOptional()
  @Prop({ type: SchemaTypes.String })
  flash_sale_end_date: string;

  @ApiProperty({
    example: 0,
    required: true,
    type: Number,
    description: `Flash Sale Poin.`,
  })
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number })
  flash_sale_poin: number;

  @ApiProperty({
    example: 0,
    required: true,
    type: Number,
    description: `Flash Sale quota.`,
  })
  @IsNumber()
  @IsOptional()
  @Prop({ type: SchemaTypes.Number })
  flash_sale_quota: number;

  @ApiProperty({
    type: KeywordMaxRedeemTreshold,
    description: 'Max redeem treshold',
  })
  @IsOptional()
  @Prop({ type: KeywordMaxRedeemTreshold, default: {} })
  max_redeem_threshold: KeywordMaxRedeemTreshold;

  @ApiProperty({
    type: KeywordFlashSaleEligibility,
    description: 'Flashsale',
  })
  @IsOptional()
  @Type(() => KeywordFlashSaleEligibility)
  @Prop({ type: KeywordFlashSaleEligibility, default: {} })
  flashsale: KeywordFlashSaleEligibility;

  constructor(
    name?: string,
    start_period?: Date,
    end_period?: Date,
    program_experience?: string[],
    keyword_type?: string,
    point_type?: Lov,
    program_id?: ProgramV2,
    poin_value?: string,
    poin_redeemed?: number,
    channel_validation?: boolean,
    channel_validation_list?: Channel[],
    locations?: Location[],
    eligibility_locations?: boolean,
    program_title_expose?: string,
    merchant?: string,
    merchandise_keyword?: boolean,
    keyword_schedule?: string,
    // program_shift?: KeywordProgramShift[],
    program_bersubsidi?: boolean,
    total_budget?: number,
    customer_value?: number,
    multiwhitelist?: boolean,
    multiwhitelist_program?: ProgramV2[],
    enable_sms_masking?: boolean,
    sms_masking?: string,
    timezone?: string,
    for_new_redeemer?: boolean,
    max_mode?: string,
    max_redeem_counter?: number,
    segmentation_customer_tier?: CustomerTier[],
    segmentation_customer_los_operator?: string,
    segmentation_customer_los_max?: number,
    segmentation_customer_los_min?: number,
    segmentation_customer_los?: number,
    segmentation_customer_type?: string,
    segmentation_customer_most_redeem?: CustomerBadge[],
    segmentation_customer_brand?: CustomerBrand[],
    segmentation_customer_prepaid_registration?: boolean,
    segmentation_customer_kyc_completeness?: boolean,
    segmentation_customer_poin_balance_operator?: string,
    segmentation_customer_poin_balance?: number,
    segmentation_customer_poin_balance_max?: number,
    segmentation_customer_poin_balance_min?: number,
    segmentation_customer_preference?: string,
    segmentation_customer_arpu_operator?: string,
    segmentation_customer_arpu?: number,
    segmentation_customer_arpu_min?: number,
    segmentation_customer_arpu_max?: number,
    segmentation_customer_preferences_bcp?: string,
    segmentation_employee_numbers?: boolean,
    location_type?: Location,
    location_area_identifier?: Location,
    location_region_identifier?: Location,
    flash_sale_start_date?: string,
    flash_sale_end_date?: string,
    flash_sale_poin?: number,
    flash_sale_quota?: number,
    max_redeem_threshold?: KeywordMaxRedeemTreshold,
    flashsale?: KeywordFlashSaleEligibility,
  ) {
    this.name = name;
    this.start_period = start_period;
    this.end_period = end_period;
    this.program_experience = program_experience;
    this.keyword_type = keyword_type;
    this.point_type = point_type;
    this.poin_value = poin_value;
    this.poin_redeemed = poin_redeemed;
    this.channel_validation = channel_validation;
    this.channel_validation_list = channel_validation_list;
    this.eligibility_locations = eligibility_locations;
    this.locations = locations;
    this.program_title_expose = program_title_expose;
    this.merchant = merchant;
    this.program_id = program_id;
    this.merchandise_keyword = merchandise_keyword;
    this.keyword_schedule = keyword_schedule;
    // this.program_shift = program_shift;
    this.program_bersubsidi = program_bersubsidi;
    this.total_budget = total_budget;
    this.customer_value = customer_value;
    this.multiwhitelist = multiwhitelist;
    this.multiwhitelist_program = multiwhitelist_program;
    this.enable_sms_masking = enable_sms_masking;
    this.sms_masking = sms_masking;
    this.timezone = timezone;
    this.for_new_redeemer = for_new_redeemer;
    this.max_mode = max_mode;
    this.max_redeem_counter = max_redeem_counter;
    this.segmentation_customer_tier = segmentation_customer_tier;
    this.segmentation_customer_los_operator =
      segmentation_customer_los_operator;
    this.segmentation_customer_los_max = segmentation_customer_los_max;
    this.segmentation_customer_los_min = segmentation_customer_los_min;
    this.segmentation_customer_los = segmentation_customer_los;
    this.segmentation_customer_type = segmentation_customer_type;
    this.segmentation_customer_most_redeem = segmentation_customer_most_redeem;
    this.segmentation_customer_brand = segmentation_customer_brand;
    this.segmentation_customer_prepaid_registration =
      segmentation_customer_prepaid_registration;
    this.segmentation_customer_kyc_completeness =
      segmentation_customer_kyc_completeness;
    this.segmentation_customer_poin_balance_operator =
      segmentation_customer_poin_balance_operator;
    this.segmentation_customer_poin_balance =
      segmentation_customer_poin_balance;
    this.segmentation_customer_poin_balance_max =
      segmentation_customer_poin_balance_max;
    this.segmentation_customer_poin_balance_min =
      segmentation_customer_poin_balance_min;
    this.segmentation_customer_preference = segmentation_customer_preference;
    this.segmentation_customer_arpu_operator =
      segmentation_customer_arpu_operator;
    this.segmentation_customer_arpu = segmentation_customer_arpu;
    this.segmentation_customer_arpu_min = segmentation_customer_arpu_min;
    this.segmentation_customer_arpu_max = segmentation_customer_arpu_max;
    this.segmentation_customer_preferences_bcp =
      segmentation_customer_preferences_bcp;
    this.segmentation_employee_numbers = segmentation_employee_numbers;
    this.location_type = location_type;
    this.location_area_identifier = location_area_identifier;
    this.location_region_identifier = location_region_identifier;
    this.flash_sale_start_date = flash_sale_start_date;
    this.flash_sale_end_date = flash_sale_end_date;
    this.flash_sale_poin = flash_sale_poin;
    this.flash_sale_quota = flash_sale_quota;
    this.max_redeem_threshold = max_redeem_threshold;
    this.flashsale = flashsale;
  }
}

export const KeywordEligibilitySchema =
  SchemaFactory.createForClass(KeywordEligibility);
