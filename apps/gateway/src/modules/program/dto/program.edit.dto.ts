import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

import { Location } from '@/location/models/location.model';

import { Lov } from '../../lov/models/lov.model';
import { Program } from '../models/program.model';
import { ProgramNotification } from '../models/program.notification.model';
import { ProgramNotificationAddDTO } from './program.notification.add.dto';

export class ProgramEditDTO {
  @ApiProperty({
    example: 'PRG001',
    description: 'Name of program',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'This program description',
    description: 'Desribe program detail information',
  })
  @IsString()
  desc: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
    description: 'Date of Start Period',
  })
  @IsString()
  start_period: Date;

  @ApiProperty({
    example: 'YYYY-MM-DD',
    description: 'Date of End Period',
  })
  @IsString()
  end_period: Date;

  @ApiProperty({
    example: '{LOV ID}',
    description: 'Point Type',
  })
  @IsString()
  point_type: Lov;

  @ApiProperty({
    type: [ProgramNotificationAddDTO],
    description: 'Array of notification format',
  })
  @IsArray()
  @Type(() => ProgramNotification)
  program_notification: ProgramNotification[];

  // @ApiProperty({
  //   type: [ProgramSegmentationAddDTO],
  //   description: 'Array of segmentation format',
  // })
  // @IsArray()
  // @Type(() => ProgramSegmentation)
  // program_segmentation: ProgramSegmentation[];

  @ApiProperty({
    example: '{LOV MECHANISM}',
    description: 'Mechanism of program segmentation',
  })
  @IsString()
  program_mechanism: Lov;

  @ApiProperty({
    example: '{Location ID}',
    description: 'Owner of the Program segmentation',
  })
  @IsString()
  program_owner: Location;

  @ApiProperty({
    example: '',
    description: 'Owner Detail',
  })
  @IsString()
  program_owner_detail: string;

  @ApiProperty({
    example: 'Just type the program segmentation logic',
    description: 'Logic of program segmentation',
  })
  @IsString()
  logic: string;

  @ApiProperty({
    example: false,
    description: 'Enable LOS',
  })
  @IsBoolean()
  c_los_enable: boolean;

  @ApiProperty({
    example: 20,
    description: 'LOS Value',
  })
  @IsNumber()
  c_los_value: number;

  @ApiProperty({
    example: 20,
    description: 'Customer Point Balance',
  })
  @IsNumber()
  c_point_balance: number;

  @ApiProperty({
    example: '',
    description: 'Other program id as parent',
  })
  program_parent: Program;
}

export class ProgramEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
