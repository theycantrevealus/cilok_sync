import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBadgeDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BADGE_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Badge Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
