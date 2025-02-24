import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantPatnerDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_PATNER_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Patner Delete Successfully' })
  @IsString()
  message: string;

  payload: any;
}
