import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class BidDeleteDTOResponse {
  @ApiProperty({ example: 'BID_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'Success' })
  @IsString()
  message: string;

  payload: any;
}
