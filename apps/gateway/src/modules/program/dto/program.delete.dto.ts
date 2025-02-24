import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ProgramDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
