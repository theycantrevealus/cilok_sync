import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RewardCatalogFilterDTO {
  @ApiProperty({
    description: 'The keyword to filter by',
    required: false,
  })
  @IsString()
  @IsOptional()
  keyword: string;

  @ApiProperty({
    description: 'The category to filter by',
    required: false,
  })
  @IsString()
  @IsOptional()
  category: string;

  @ApiProperty({
    description: 'The merchant ID to filter by',
    required: false,
  })
  @IsString()
  @IsOptional()
  merchant_id: string;
}
