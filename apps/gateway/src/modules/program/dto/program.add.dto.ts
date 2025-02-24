import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

import { ProgramNotification } from '../models/program.notification.model';

export class ProgramAddDTO {
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
    example: '2022-01-02',
    description: 'Date of Start Period',
  })
  @IsString()
  start_period: string;

  @ApiProperty({
    example: '2032-01-02',
    description: 'Date of End Period',
  })
  @IsString()
  end_period: string;

  @ApiProperty({
    example: '62e928517569a65dd3f50c50',
    description: 'Point Type',
  })
  @IsString()
  point_type: string;

  @ApiProperty({
    type: [],
    required: false,
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
    example: '62e96b6ed390cec33fbc9941',
    description: 'Mechanism of program segmentation',
  })
  @IsString()
  program_mechanism: string;

  @ApiProperty({
    example: '62ebf2a43058d812df93ed47',
    description: 'Owner of the Program segmentation',
  })
  @IsString()
  program_owner: string;

  @ApiProperty({
    example: 'Test',
    description: 'Owner Detail',
  })
  @IsString()
  program_owner_detail: string;

  // @ApiProperty({ type: 'string', format: 'binary', required: false })
  // whitelist: any | null;

  // @ApiProperty({ type: 'string', format: 'binary', required: false })
  // blacklist: any | null;

  @ApiProperty({
    enum: ['Union', 'Intersection'],
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
    required: false,
    description: 'Other program id as parent',
  })
  program_parent: string | null;
}

export class ProgramAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
