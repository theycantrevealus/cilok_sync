import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Channel } from 'diagnostics_channel';

import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';

export class ProgramWinnerDTO {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber number',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Auction Keyword',
  })
  @IsString()
  keyword: KeywordEligibility;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Natioanl Registration ID',
  })
  @IsString()
  nik: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Subscriber Name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Email address',
  })
  @IsString()
  email: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Province',
  })
  @IsString()
  province: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Kabupaten',
  })
  @IsString()
  district: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Kecamatan',
  })
  @IsString()
  sub_district: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Postal Code',
  })
  @IsString()
  postal_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Address',
  })
  @IsString()
  address: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction if`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: 'string',
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: Channel;

  @ApiProperty({
    required: false,
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  additional_param: string;
}
