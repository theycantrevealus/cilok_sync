import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PartnerEditDTO {
  @ApiProperty({
    required: true,
    example: 'Partner Code',
  })
  @IsNotEmpty()
  @IsString()
  partner_code: string;

  @ApiProperty({
    required: true,
    example: 'Name of Partner',
  })
  @IsNotEmpty()
  @IsString()
  partner_name: string;

  @ApiProperty({
    enum: ['APPROVED', 'REJECTED'],
  })
  @IsString()
  partner_status: string;
}

export class PartnerEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PARTNER_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Partner updated successfully' })
  @IsString()
  message: string;

  payload: any;
}
