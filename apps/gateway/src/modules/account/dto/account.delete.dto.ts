import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class AccountDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ACCOUNT_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Account Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
