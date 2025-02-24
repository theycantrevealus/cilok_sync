import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { Location } from '@/location/models/location.model';

import { Account } from '../models/account.model';

export class AccountAssignDTO {
  @ApiProperty({
    example: '',
    type: 'string',
    description: 'Account to assign',
  })
  @IsString()
  account: string;

  @ApiProperty({
    example: '',
    type: 'string',
    description: 'Location to be added',
  })
  @IsString()
  location: string;
}

export class AccountAssignDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ACCOUNT_ASSIGN_LOCATION' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Account assigned successfully' })
  @IsString()
  message: string;

  payload: any;
}
