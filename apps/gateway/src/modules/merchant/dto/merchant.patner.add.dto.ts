import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantPatnerAddDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: 'M42727',
    description: '',
  })
  @IsString()
  partner_code: string;

  @ApiProperty({
    required: true,
    example: 'INUL VISTA KARAWANG',
    description: '',
  })
  @IsString()
  partner_name: string;

  @ApiProperty({
    required: true,
    example: '469878946464',
    description: '',
  })
  @IsString()
  registration_number: string;

  @ApiProperty({
    required: true,
    example: 'testt',
    description: '',
  })
  @IsString()
  priority: string;

  @ApiProperty({
    required: true,
    example: '08526565454',
    description: '',
  })
  @IsString()
  contact_person: string;

  @ApiProperty({
    required: true,
    example: '08526565454',
    description: '',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    required: true,
    example: '7319@gmail.com',
    description: '',
  })
  @IsString()
  contact_email: string;

  @ApiProperty({
    required: true,
    example: 'Supermall Karawang Lt. 1 & 2',
    description: '',
  })
  @IsString()
  address: string;

  @ApiProperty({
    required: true,
    example: 'telkomsel.com',
    description: '',
  })
  @IsString()
  website: string;

  @ApiProperty({
    required: true,
    example: 'Testing',
    description: '',
  })
  @IsString()
  remark: string;

  @ApiProperty({ type: 'string', enum: ['Active', 'Inactive'] })
  @IsString()
  status: string;

  @ApiProperty({
    required: true,
    example: '3213464645131',
    description: '',
  })
  @IsString()
  npwp: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsString()
  partner_logo: any;

  @ApiProperty({
    required: true,
    example: '3.5782656',
    description: '',
  })
  longtitude: string;

  @ApiProperty({
    required: true,
    example: '98.6775552',
    description: '',
  })
  latitude: string;
}

export class MerchantPatnerLogoDTO {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class MerchantPatnerAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_PATNER_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Patner Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
