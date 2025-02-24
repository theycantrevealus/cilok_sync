import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MerchantPatnerEditDTO {
  @ApiProperty({
    uniqueItems: true,
    example: 'M42727',
    required : false,
    description: '',
  })
  @IsString()
  partner_code: string;

  @ApiProperty({
    example: 'INUL VISTA KARAWANG',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  partner_name: string;

  @ApiProperty({
    example: '469878946464',
    required : false,
    description: '',
  })
  @IsString()
  registration_number: string;

  @ApiProperty({
    example: 'testt',
    required : false,
    description: '',
  })
  @IsString()
  priority: string;

  @ApiProperty({
    example: '08526565454',
    required : false,
    description: '',
  })
  @IsString()
  contact_person: string;

  @ApiProperty({
    example: '08526565454',
    required : false,
    description: '',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: '7319@gmail.com',
    required : false,
    description: '',
  })
  @IsString()
  contact_email: string;

  @ApiProperty({
    example: 'Supermall Karawang Lt. 1 & 2',
    required : false,
    description: '',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: 'telkomsel.com',
    required : false,
    description: '',
  })
  @IsString()
  website: string;

  @ApiProperty({
    example: 'Testing',
    required : false,
    description: '',
  })
  @IsString()
  remark: string;

  @ApiProperty({ type: 'string',required : false, enum: ['Active', 'Inactive'] })
  @IsString()
  status: string;

  @ApiProperty({
    required : false,
    example: '3213464645131',
    description: '',
  })
  @IsString()
  npwp: string;

  @ApiProperty({ type: 'string',required : true, format: 'binary' })
  @IsString()
  partner_logo: any;

  @ApiProperty({
    example: '3.5782656',
    required : false,
    description: '',
  })
  longtitude: string;

  @ApiProperty({
    example: '98.6775552',
    required : false,
    description: '',
  })
  latitude: string;
}

export class MerchantPatnerLogoDTO {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class MerchantPatnerEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_PATNER_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Patner Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
