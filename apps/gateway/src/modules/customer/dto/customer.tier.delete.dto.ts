import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerTierDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'TIER_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Tier Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
