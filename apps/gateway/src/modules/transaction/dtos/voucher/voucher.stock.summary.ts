import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
} from 'class-validator';

export class VoucherStockSummaryDTO {
  @ApiProperty({
    required: true,
    type: String,
    example : "63b40180924c2b8461462d45"
  })
  @IsString()
  keyword_id: string;

  @ApiProperty({
    required: false,
    type: String,
    enum : ['batch', 'upload'],
    example : "upload"
  })
  @IsString()
  type: string;
}

export class VoucherStockSummaryDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  code: string;

  @ApiProperty({ example: 'Voucher Stock' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Success' })
  @IsString()
  message: string;

  payload: any;
}
