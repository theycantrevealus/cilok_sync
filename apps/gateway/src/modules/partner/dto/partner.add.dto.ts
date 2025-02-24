import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PartnerAddDTO {
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

export class PartnerAddBulkDTO {
  @ApiProperty({
    required: true,
    type: [PartnerAddDTO],
    example: [],
  })
  @IsNotEmpty()
  @IsArray()
  datas: PartnerAddDTO[];
}

export class PartnerAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PARTNER_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Partner Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
