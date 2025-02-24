import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ProductEditDTO {
  @ApiProperty({
    required: true,
    example: 'group name',
  })
  @IsNotEmpty()
  @IsString()
  group_name: string;

  @ApiProperty({
    required: true,
    example: 'set value',
  })
  @IsNotEmpty()
  @IsString()
  set_value: string;
}

export class ProductEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PRODUCT_EDUT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Product Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
