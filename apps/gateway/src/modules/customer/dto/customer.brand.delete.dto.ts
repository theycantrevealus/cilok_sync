import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBrandDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BRAND_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Brand Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
