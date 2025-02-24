import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ProgramApprovalDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_APPROVAL' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Approved' })
  @IsString()
  message: string;

  payload: any;
}
