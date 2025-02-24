import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
} from 'class-validator';

export class VoucherCheckUpdateDTO {
  @ApiProperty({
    required: true,
    enum: ['batch', 'upload'],
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    required: true,
    type: Number,
    default : 500
  })
  @IsNumber()
  limit: number;
}

export class VoucherDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  code: string;

  @ApiProperty({ example: 'Voucher Creation' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Voucher Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
