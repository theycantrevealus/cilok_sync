import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { Account } from '@/account/models/account.model';

export class ProgramWinnerBody {
  @ApiProperty({
    example: 'en-US',
    required: false,
  })
  @IsString()
  locale: string;

  @ApiProperty({
    description: 'Subscriber number',
    required: true,
    example: '',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    description: 'Auction Keyword',
    required: true,
    example: '',
  })
  @IsString()
  keyword: string;

  @ApiProperty({
    description: 'National Registration ID',
    required: true,
    example: '',
  })
  @IsString()
  nik: string;

  @ApiProperty({
    description: 'Subscriber Name',
    required: false,
    example: '',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email address',
    required: false,
    example: '',
  })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Province',
    required: false,
    example: '',
  })
  @IsString()
  province: string;

  @ApiProperty({
    description: 'Kabupaten',
    required: false,
    example: '',
  })
  @IsString()
  district: string;

  @ApiProperty({
    description: 'Kecamatan',
    required: false,
    example: '',
  })
  @IsString()
  sub_district: string;

  @ApiProperty({
    description: 'Postal Code',
    required: false,
    example: '',
  })
  @IsString()
  postal_code: string;

  @ApiProperty({
    description: 'Address',
    required: false,
    example: '',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: `Channel transaction id`,
    required: false,
    example: '',
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    description: `Channel information from source application`,
    required: false,
    example: '',
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
    required: false,
    example: '',
  })
  @IsString()
  additional_param: string;
}

export class ProgramWinnerRequestDto {
  /**
   * body is an object
   */
  @Type(() => ProgramWinnerBody)
  body: ProgramWinnerBody;

  /**
   * account is an Account
   */
  @Type(() => Account)
  account: Account;

  /**
   * token is bearer token to request core api
   */
  @IsString()
  token: string;
}
