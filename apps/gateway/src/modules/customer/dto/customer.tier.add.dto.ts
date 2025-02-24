import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerTierAddDTO {
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

  @ApiProperty({
    example: 'Core integration',
  })
  @IsString()
  core_id: string;

  constructor(data: any) {
    this.name = data.name;
    this.description = data.description;
    this.core_id = data.core_id;
  }
}

export class CustomerTierAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'TIER_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Tier Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
