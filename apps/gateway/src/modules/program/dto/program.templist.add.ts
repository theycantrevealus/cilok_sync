import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

import { ProgramSingleTempAddDTO } from './program.templist.single.add.dto';
import { identifierSSO } from '@/application/utils/Msisdn/formatter';

export class ProgramTemplistAddDTO {
  @ApiProperty({
    type: ProgramSingleTempAddDTO,
    isArray: true,
    description: 'List of segmentation',
  })
  @IsArray()
  set: ProgramSingleTempAddDTO[];

  @ApiProperty({ example: identifierSSO })
  @IsString()
  identifier: string;

}

export class ProgramTemplistAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_TEMPLIST_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Templist Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}