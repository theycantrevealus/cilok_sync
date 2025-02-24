import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBrandEditDTO {
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

export class CustomerBrandEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BRAND_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Brand Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
