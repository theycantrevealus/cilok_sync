import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class KeywordApprovalDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'KEYWORD_APPROVAL' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Keyword Approved' })
  @IsString()
  message: string;

  payload: any;
}
