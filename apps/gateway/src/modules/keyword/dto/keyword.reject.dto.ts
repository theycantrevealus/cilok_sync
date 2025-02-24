import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class KeywordRejectDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'KEYWORD_REJECT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Keyword Reject' })
  @IsString()
  message: string;

  payload: any;
}
