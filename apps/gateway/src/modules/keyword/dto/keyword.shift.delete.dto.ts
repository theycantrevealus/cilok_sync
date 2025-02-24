import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class KeywordShiftDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'KEYWORD_NOTIFICATION_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Keyword delete status' })
  @IsString()
  message: string;

  payload: any;
}
