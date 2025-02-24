import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOV_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
