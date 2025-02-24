import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';
export class ProgramGroupAddDTO {
  @ApiProperty({
    example: 'GROUP NAME',
    required: true,
    description: 'Name of group name',
  })
  @IsString()
  group_name: string;
}

export class ProgramGroupAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PRODGRAM_GROUP_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Group Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
