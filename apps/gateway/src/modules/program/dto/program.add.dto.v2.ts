import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
} from 'class-validator';

import { Account } from '@/account/models/account.model';
import { Role } from '@/account/models/role.model';
import { Lov } from '@/lov/models/lov.model';

import { ProgramV2 } from '../models/program.model.v2';
import { ProgramNotification } from '@/program/models/program.notification.model.v2';
import { ProgramNotificationDTO } from './program.notification.dto';
import { KeywordPopulate } from '@/keyword/models/keyword.populate.model';
import { ProgramGroup } from '@/lov/models/program.group.model';
import { Location } from '@/location/models/location.model';

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsTodayOrAfterConstraint implements ValidatorConstraintInterface {
  validate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);
    return inputDate >= today;
  }
}

export function IsTodayOrAfter(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTodayOrAfterConstraint,
    });
  };
}

export class ProgramAddDTO {
  @ApiProperty({
    example: 'PRG001',
    required: true,
    description: 'Name of program',
    uniqueItems: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'This program description',
    required: true,
    description: 'Desribe program detail information',
  })
  @IsString()
  desc: string;

  @ApiProperty({
    example: '2022-01-02',
    description: 'Date of Start Period',
  })
  @IsDateString()
  @IsTodayOrAfter({
    message: 'start_period must be a date equal to or after today'
  })
  start_period: Date;

  @ApiProperty({
    example: '2032-01-02',
    description: 'Date of End Period',
  })
  @IsDateString()
  @IsTodayOrAfter({
    message: 'end_period must be a date equal to or after today'
  })
  end_period: Date;

  @ApiProperty({
    type: Lov,
    example: '',
    required: true,
    description: 'Point types.',
  })
  @Type(() => Lov)
  @IsString()
  point_type: Lov;

  @ApiProperty({
    type: Lov,
    required: true,
    example: '',
    description: 'Mechanism of program segmentation',
  })
  @Type(() => Lov)
  @IsString()
  program_mechanism: Lov;

  @ApiProperty({
    type: Lov,
    required: true,
    example: '',
    description: `Prefer to be a combobox with <a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_location_type">data source</a>`,
  })
  @Type(() => Lov)
  @IsString()
  program_owner: Lov;

  @ApiProperty({
    type: Location,
    required: true,
    example: '',
    description: `Once <b>program_owner</b> is selected. Then load a selectbox to load data from <a target="_blank" rel="noopener noreferrer" href="#/Location Management/LocationController_index">here</a> with filter parameter filter: {"type":"value_from_program_owner_field_combobox"}`,
  })
  @Type(() => Location)
  @IsString()
  program_owner_detail: Location;

  @ApiProperty({
    example: '',
    required: false,
    description: `Select a keyword from <a target="_blank" rel="noopener noreferrer" href="#/Keyword All Function/KeywordUtilityController_all">here</a> as registration keyword`,
  })
  @IsString()
  keyword_registration: string;

  @ApiProperty({
    example: 10,
    required: true,
  })
  @IsNumber()
  point_registration: number

  @ApiProperty({
    example: false,
    required: false,
    description: 'Allow whitelist counter?',
  })
  @IsBoolean()
  whitelist_counter: boolean;

  @ApiProperty({
    enum: ['Union', 'Intersection'],
    required: true,
    description: `Logic of program segmentation. It should between:<br />
    <ul>
    <li>Union</li>
    <li>Intersection</li>
    </ul>`,
  })
  @IsString()
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
  program_time_zone: string;

  @ApiProperty({
    type: ProgramGroup,
    example: '631af5fdab9b9b6e497a3db9',
    required: false,
    description: `Grouping name for reporting`,
  })
  @IsString()
  program_group: ProgramGroup;

  @ApiProperty({
    example: '',
    type: ProgramV2,
    required: false,
    description: `Program parent (Grouping purpose). Select one of <a target="_blank" rel="noopener noreferrer" href="#/Program Management/ProgramControllerV2_getProgram">program</a> as data source`,
  })
  program_parent: ProgramV2 | null;

  @ApiProperty({
    example: 'PIC',
    required: true,
    enum: ['PIC', 'Role'],
    description: `Notification for specific role or pic. It should between:<br />
    <ul>
    <li>PIC</li>
    <li>Role</li>
    </ul>`,
  })
  @IsString()
  alarm_pic_type: string;

  @ApiProperty({
    required: true,
    description: `List of role(s) or pic(s): <br />
    If <b>alarm_pic_type</b> is selected as pic then load from <a target="_blank" rel="noopener noreferrer" href="#/Account Management/AccountController_all">here</a><br />
    Else, load it from <a target="_blank" rel="noopener noreferrer" href="#/Account Management/AccountController_role_all">here</a><br />
    Field is array of _id selected, so it can be multiple`,
  })
  @IsArray()
  alarm_pic: Account[] | Role[];

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: 7,
    required: true,
    description: 'Threshold alarm for program/keyword expired. No decimal',
  })
  @IsNumber()
  threshold_alarm_expired: number;

  @ApiProperty({
    example: 70,
    minimum: 70,
    maximum: 100,
    required: true,
    description: 'Threshold alarm for voucher expired. No decimal',
  })
  @IsNumber()
  threshold_alarm_voucher: number;

  @ApiProperty({
    type: [ProgramNotificationDTO],
    required: false,
    description: 'List of notification format',
  })
  @IsArray()
  program_notification: ProgramNotification[];

  @ApiProperty({
    type: Lov,
    example: '',
    required: true,
    description: 'Point types.',
  })
  @IsString()
  @Type(() => Lov)
  program_approval: Lov;

  @ApiProperty({
    type: Account,
    example: '',
    required: true,
    description: 'Point types.',
  })
  @Type(() => Account)
  @IsString()
  hq_approver: Account;

  @ApiProperty({
    type: Account,
    example: '',
    required: true,
    description: 'Point types.',
  })
  @Type(() => Account)
  @IsString()
  non_hq_approver: Account;

  @ApiProperty({
    example: false,
    required: true,
  })
  @IsBoolean()
  is_draft: boolean;

  @ApiProperty({
    example: false,
    required: true,
  })
  @IsBoolean()
  is_stoped: boolean;

  @ApiProperty({
    example: false,
    required: true,
  })
  @IsBoolean()
  need_review_after_edit: boolean;

  @IsObject()
  @Type(() => Account)
  created_by: any | null;

  @IsDateString()
  created_at: Date;

  @IsDateString()
  updated_at: Date;

  @IsDateString()
  deleted_at: Date | null;

  @IsString()
  @Type(() => ProgramV2)
  program_edit: ProgramV2;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  whitelist_check: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  is_whitelist: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsBoolean()
  is_blacklist: boolean;
}

export class ProgramAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PRODGRAM_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
