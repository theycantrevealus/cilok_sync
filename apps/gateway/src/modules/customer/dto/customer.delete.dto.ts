import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CUSTOMER_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
