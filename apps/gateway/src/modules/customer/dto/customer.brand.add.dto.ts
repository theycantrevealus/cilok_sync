import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBrandAddDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: 'KartuAs',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'KartuAs',
  })
  @IsString()
  description: string;
}

export class CustomerBrandAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BRAND_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Brand Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
