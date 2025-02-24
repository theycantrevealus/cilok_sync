import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantV2DeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_V2_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
