import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ProgramGroupDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_GROUP_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Group Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
