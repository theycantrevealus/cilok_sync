import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class PartnerDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PARTNER_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Partner deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
