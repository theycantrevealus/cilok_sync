import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { Role } from '@/account/models/role.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';
import { ProgramGroup } from '@/lov/models/program.group.model';
import { ProgramNotificationDTO } from '@/program/dto/program.notification.dto';
import { ProgramNotification } from '@/program/models/program.notification.model.v2';

export type ProgramV2Document = ProgramV2 & Document;
@Schema()
export class ProgramV2 {
  @ApiProperty({
    description: 'Program Name',
    example: 'PRG001',
    uniqueItems: true,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  name: string;

  @ApiProperty({
    example: 'This program description',
    required: false,
    description: 'Desribe program detail information',
  })
  @IsString()
  @Prop({
    required: false,
    type: SchemaTypes.String,
  })
  desc: string;

  @ApiProperty({
    example: '2023-08-01T10:20:00.000+07:00',
    required: true,
  })
  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  start_period: Date;
  
  @ApiProperty({
    example: '2024-08-01T10:20:00.000+07:00',
    required: true,
  })
  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  end_period: Date;
  
  @ApiProperty({
    type: Lov,
    example: '62ffbdd1745271e7ba71e848',
    required: true,
    description: `Refer to <a target="_blank" rel="noopener noreferrer" href="#/LOV%20(List%20of%20Values)%20Management/LovController_get_point_type">this data source</a>`,
  })
  @IsNotEmpty()
  @Type(() => Lov)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
    required: true,
  })
  @Type(() => Lov)
  point_type: Lov;

  @ApiProperty({
    type: Lov,
    example: '62ffbdd1745271e7ba71e848',
    required: true,
    description: `Refer to <a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_mechanism">this data source</a>`,
  })
  @IsNotEmpty()
  @Type(() => Lov)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
    required: true,
  })
  program_mechanism: Lov;

  // @ApiProperty({
  //   type: Lov,
  //   example: '6300f9f56c248f55eead206f',
  //   required: false,
  //   description: `Refer to <a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_program_experience">this data source</a>`,
  // })
  // @IsString()
  // @Type(() => Lov)
  // @Prop({
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: Lov.name,
  //   required: false,
  //   default: null,
  // })
  // program_experience: Lov;

  @ApiProperty({
    type: Lov,
    required: true,
    example: '62ffbdd1745271e7ba71e848',
    description: `Refer to <a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_location_type">this data source</a>`,
  })
  @IsNotEmpty()
  @Type(() => Lov)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
    required: true,
  })
  program_owner: Lov;

  @ApiProperty({
    type: Location,
    required: true,
    example: '62ffbdd1745271e7ba71e848',
    description: `Refer to <a target="_blank" rel="noopener noreferrer" href="#/Location Management/LocationController_index">here</a> with filter parameter filter: {"type":"value_from_program_owner_field_combobox"}`,
  })
  @Type(() => Location)
  @IsNotEmpty()
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Location.name,
    required: true,
  })
  program_owner_detail: Location;

  @ApiProperty({
    example: 'Keyword registration',
    required: false,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  keyword_registration: string;

  @ApiProperty({
    example: 10,
    required: true,
  })
  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: function () {
      return !this.keyword_registration || this.point_registration === -1; // Field is required if keyword_registration is not provided or point_registration is -1
    },
    validate: [
      {
        validator: function (value: number) {
          return value >= 0; // Ensure point_registration is not negative
        },
        message: 'Invalid value for point_registration. Must be a non-negative number.',
      },
      {
        validator: function (value: number) {
          return !(this.keyword_registration && value < 0);
        },
        message: 'Invalid value for point_registration when keyword_registration is provided',
      },
    ],
  })
  point_registration: number;  

  @ApiProperty({
    example: false,
    required: true,
  })
  @IsBoolean()
  @Prop({
    type: SchemaTypes.Boolean,
    required: true,
  })
  whitelist_counter: boolean;

  @ApiProperty({
    example: 'Union',
    required: true,
    enum: ['Union', 'Intersection'],
    description: `Select option. It should between:<br />
    <ul>
    <li>Union</li>
    <li>Intersection</li>
    </ul>`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  logic: string;

  @ApiProperty({
    example: 'WIB',
    required: true,
    enum: ['WIB', 'WITA', 'WIT', 'GENERAL'],
    description: `Select option. It should be one of the following:<br />
    <ul>
    <li>WIB</li>
    <li>WITA</li>
    <li>WIT</li>
    <li>GENERAL</li>
    </ul>`,
  })
  @IsString()
  @IsIn(['WIB', 'WITA', 'WIT', 'GENERAL'], { message: 'Time zone not supported' })
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  program_time_zone: string;
  
  @ApiProperty({
    type: ProgramGroup,
    example: '631af5fdab9b9b6e497a3db9',
    required: false,
    description: `Grouping name for reporting`,
  })
  @IsString()
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: ProgramGroup.name,
  })
  program_group: ProgramGroup;

  @ApiProperty({
    example: 'PIC',
    required: false,
    enum: ['PIC', 'Role'],
    description: `Notification for specific role or pic. It should between:<br />
    <ul>
    <li>PIC</li>
    <li>Role</li>
    </ul>`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  alarm_pic_type: string;

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['6310c6b265479723a5807fde', '6310d4bcc2022864a629dccf'],
    description: `List of role(s) or pic(s): <br />
    If <b>alarm_pic_type</b> is selected as pic then load from <a target="_blank" rel="noopener noreferrer" href="#/Account Management/AccountController_all">here</a><br />
    Else, load it from <a target="_blank" rel="noopener noreferrer" href="#/Account Management/AccountController_role_all">here</a><br />
    Field is array of _id selected, so it can be multiple`,
  })
  @IsArray()
  @Prop({
    type: mongoose.Schema.Types.Mixed,
    required: false,
  })
  alarm_pic: Role[] | Account[];

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: 7,
    required: true,
    description: 'Threshold alarm for program/keyword expired. No decimal',
  })
  @IsNumber()
  @Prop({
    required: true,
    type: SchemaTypes.Number,
    min: 0,
    max: 7,
    validate:[
      {
        validator: function(value: number){
          return value >= 0;
        },
        message: "Invalid value for threshold_alarm_expired. Must be a non-negative number.",
      },
    ],
  })
  threshold_alarm_expired: number;

  @ApiProperty({
    example: 0,
    required: false,
    description: 'Threshold Quota',
  })
  @IsNumber()
  @Prop({
    required: false,
    type: SchemaTypes.Number,
    validate:[
      {
        validator: function(value: number){
          return value >= 0;
        },
        message: "Invalid value for threshold_alarm_voucher. Must be a non-negative number.",
      },
    ],
  })
  threshold_alarm_voucher: number;

  @ApiProperty({
    type: ProgramNotificationDTO,
    isArray: true,
    required: false,
    description: 'List of notification format',
  })
  @IsArray()
  @Prop({
    required: false,
    type: SchemaTypes.Array,
  })
  program_notification: ProgramNotification[];

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
  })
  @Type(() => Lov)
  program_approval: Lov;

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

  @Prop({
    type: Types.ObjectId,
    ref: ProgramV2.name,
    required: false,
  })
  @Type(() => ProgramV2)
  program_parent: ProgramV2 | null;

  // @Prop({
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: Location.name,
  //   required: false,
  // })
  // @Type(() => Location)
  // creator_location: Location;
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
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  created_by: any | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: ProgramV2.name,
    default: null,
  })
  @Type(() => ProgramV2)
  program_edit: ProgramV2;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  whitelist_check: boolean;

  //FIELD NEW BUAT KEBUTUHAN SEGMENTION ELIGI
  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  is_whitelist: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  @Prop({ required: false, type: SchemaTypes.Boolean, default: false })
  is_blacklist: boolean;
  
  constructor(
    name?: string,
    desc?: string,
    start_period?: Date,
    end_period?: Date,
    point_type?: Lov,
    program_mechanism?: Lov,
    program_owner?: Lov,
    program_owner_detail?: Location,
    keyword_registration?: string,
    point_registration?: number,
    whitelist_counter?: boolean,
    logic?: string,
    program_time_zone?: string,
    program_group?: ProgramGroup,
    alarm_pic_type?: string,
    alarm_pic?: Role[] | Account[],
    threshold_alarm_expired?: number,
    threshold_alarm_voucher?: number,
    program_approval?: Lov,
    program_notification?: ProgramNotification[],
    program_parent?: ProgramV2 | null,
    // creator_location?: Location,
    created_by?: Account | null,
    is_draft?: boolean,
    is_whitelist?: boolean,
    is_blacklist?: boolean,
  ) {
    this.name = name;
    this.desc = desc;
    this.start_period = start_period;
    this.end_period = end_period;
    this.point_type = point_type;
    this.program_mechanism = program_mechanism;
    this.program_owner = program_owner;
    this.program_owner_detail = program_owner_detail;
    this.keyword_registration = keyword_registration;
    this.point_registration = point_registration;
    this.whitelist_counter = whitelist_counter;
    this.logic = logic;
    this.program_time_zone = program_time_zone;
    this.program_group = program_group;
    this.alarm_pic_type = alarm_pic_type;
    this.alarm_pic = alarm_pic;
    this.threshold_alarm_expired = threshold_alarm_expired;
    this.threshold_alarm_voucher = threshold_alarm_voucher;
    this.program_approval = program_approval;
    this.program_notification = program_notification;
    this.program_parent = program_parent;
    // this.creator_location = creator_location;
    this.created_by = created_by;
    this.is_draft = is_draft;
    this.is_whitelist = is_whitelist;
    this.is_blacklist = is_blacklist;
  }
}

const ProgramV2Schema = SchemaFactory.createForClass(ProgramV2);
ProgramV2Schema.index({ name: 'text', desc: 'text', start_period: 'text' });
export { ProgramV2Schema };
