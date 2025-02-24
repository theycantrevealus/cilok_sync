import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { Lov } from '../../lov/models/lov.model';

export class ProgramSegmentationAddDTO {
  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
  })
  @IsString()
  customer_msisdn: string;

  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
  })
  @IsString()
  customer_tier: string;

  @ApiProperty({
    description: 'Enable or Disable customer los',
  })
  @IsString()
  customer_los_enable: boolean;

  @ApiProperty({
    description: 'Type of customer los',
  })
  @IsString()
  customer_los_type: string;

  @ApiProperty({
    description: 'Value of customer los',
  })
  @IsString()
  customer_los_value: string;

  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
    description: 'ID of LOV',
  })
  @IsString()
  customer_type: Lov[];

  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
    description: 'ID of customer badge',
  })
  @IsString()
  customer_badges: string;

  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
    description: 'ID of customer location',
  })
  @IsString()
  customer_location: string;

  @ApiProperty({
    example: '62e8bd5415a463e4709ab5a0',
    description: 'ID of customer brand',
  })
  @IsString()
  customer_brand: string;

  @ApiProperty({
    description: 'Balance of customer point',
  })
  @IsString()
  customer_point_balance: number;

  @ApiProperty({
    description: 'Preferences of customer',
  })
  @IsString()
  customer_preferences: string;

  @ApiProperty({
    description: 'ARPU of customer',
  })
  @IsString()
  customer_ARPU: string;
}
