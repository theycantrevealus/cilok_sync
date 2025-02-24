import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerTierEditDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: 'Gold',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Tier description. Minimal archievement for example',
  })
  @IsString()
  description: string;
}

export class CustomerTierEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'TIER_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Tier Edit Successfully' })
  @IsString()
  message: string;

  payload: any;
}
