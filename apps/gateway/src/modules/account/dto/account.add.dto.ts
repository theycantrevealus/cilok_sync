import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { Location } from '@/location/models/location.model';

export class AccountAddDTO {
  @ApiProperty({
    example: 'id-ID',
    description: 'Locale',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    example: 'anonymous',
    description: 'Username',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: '0000',
    description: 'Employee number',
  })
  @IsString()
  employee_no: string;

  @ApiProperty({
    example: 'Mr.',
    description: 'First Name',
  })
  @IsString()
  firstname: string;

  @ApiProperty({
    example: 'Anonymous',
    description: 'Last Name',
  })
  @IsString()
  lastname: string;

  @ApiProperty({
    example: '0891234567|TH|+66',
    description: 'Contact number',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'anonymous@xyz.com',
    description: 'Email',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
    description: 'Birth date',
  })
  @IsString()
  birthdate: string;

  @ApiProperty({
    example: 'Active',
    enum: ['Active', 'Inactive'],
    description: 'Account status',
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Line ID',
  })
  @IsString()
  line_id: string;

  @ApiProperty({
    example: 'xxxxxx-5902ca0b0257bb14df426921',
    description: 'Role id',
  })
  @IsString()
  role_id: string;

  @ApiProperty({
    example: '',
    description: 'Superior id',
  })
  @IsString()
  superior_local: string;

  @ApiProperty({
    example: '',
    description: 'Superior id',
  })
  @IsString()
  superior_hq: string;

  @ApiProperty({
    type: Location,
    example: '',
    description: 'Location id',
  })
  @IsString()
  location: Location;

  @ApiProperty({
    example: 'upload_image',
    description: 'upload_image',
  })
  @IsString()
  action: string;
}

export class AccountAddDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ACCOUNT_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Keyword Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
