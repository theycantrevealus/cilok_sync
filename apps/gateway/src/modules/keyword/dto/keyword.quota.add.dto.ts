import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Location } from '../../location/models/location.model';

export class KeywordQuotaAddDTO {
  @ApiProperty({
    required: true,
    example: 'location id',
  })
  @IsNotEmpty()
  @IsString()
  location: Location;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  limit: number;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  stock: number;
}
