import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { BidAddDTO } from './bid.add.dto';

export class BidEditDTO extends BidAddDTO {}

export class BidEditDTOResponse {
  @ApiProperty({ example: 'BID_EDIT' })
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
