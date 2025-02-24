import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

import { Account } from '@/account/models/account.model';
import { Role } from '@/account/models/role.model';
import { KeywordPopulate } from '@/keyword/models/keyword.populate.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';

import { ProgramV2 } from '../models/program.model.v2';
import { ProgramNotification } from '../models/program.notification.model';
import { ProgramNotificationDTO } from './program.notification.dto';

export class ProgramEditDTO {
  @ApiProperty({
    example: 'PRG001',
    required: true,
    description: 'Name of program',
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
    required: true,
    description: 'Date of Start Period',
  })
  @IsString()
  start_period: string;

  @ApiProperty({
    example: '2032-01-02',
    required: true,
    description: 'Date of End Period',
  })
  @IsString()
  end_period: string;

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
    type: KeywordPopulate,
    example: '',
    required: false,
    description: `Select a keyword from <a target="_blank" rel="noopener noreferrer" href="#/Keyword All Function/KeywordUtilityController_all">here</a> as registration keyword`,
  })
  @IsString()
  keyword_registration: KeywordPopulate;

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
    type: String,
    enum: ['WIB', 'WITA', 'WIT'],
    required: true,
    description: `Program timezone. It should between:<br />
    <ul>
    <li>WIB</li>
    <li>WITA</li>
    <li>WIT</li>
    </ul>`,
  })
  @IsString()
  program_time_zone: string;

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
    example: false,
    required: true,
  })
  @IsBoolean()
  is_draft: boolean;
}

export class ProgramEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Clone Successfully' })
  @IsString()
  message: string;

  payload: any;
}
