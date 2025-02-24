import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantOutletDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_OUTLET_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Outlet Delete Successfully' })
  @IsString()
  message: string;

  payload: any;
}
