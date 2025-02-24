import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class MultiLang {
  @IsString()
  id: string;

  @IsString()
  en: string;
}
export class MerchantEditV2DTO {
  @ApiProperty({
    required: true,
    example: '42727',
    description: '',
  })
  @IsString()
  partner_id: string;

  @ApiProperty({
    required: true,
    example: 'INUL VISTA KARAWANG',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  merchant_name: string;

  @ApiProperty({
    required: true,
    example: 'M42727',
    description: '',
    uniqueItems: true,
  })
  @IsNotEmpty()
  @IsString()
  merchant_short_code: string;

  @ApiProperty({
    required: false,
    example: '124141',
    description: '',
  })
  @MinLength(13)
  @MaxLength(13)
  @IsString()
  siup_number: string;

  @ApiProperty({
    required: true,
    example: '62ffe0208ff494affb56fef1',
    description: 'Data Source: <b>[GET]location endpoint</b><br />',
  })
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @ApiProperty({
    required: false,
    example: '21412',
    description: '',
  })
  @MinLength(5)
  @MaxLength(5)
  @IsString()
  zip_code: string;

  @ApiProperty({
    required: false,
    example: 'Supermall Karawang Lt. 1 & 2',
    description: '',
  })
  @IsString()
  address: string;

  @ApiProperty({
    required: false,
    example: 'file tes',
    description: '',
  })
  @IsString()
  file_compro: string;

  @ApiProperty({
    required: true,
    example: 'INUL VISTA KARAWANG',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  pic_name: string;

  @ApiProperty({
    required: true,
    example: '0845464646',
    description: '',
  })
  @IsNotEmpty()
  @MinLength(11)
  @MaxLength(14)
  @IsString()
  pic_phone: string;

  // @ApiProperty({
  //   required: true,
  //   example: '62ffe0208ff494affb56fef1',
  //   description: 'Data Source: <b>[GET]Role endpoint</b><br />',
  // })
  // @IsString()
  // pic_role_id: string;

  @ApiProperty({
    required: false,
    example: '7319@gmail.com',
    description: '',
  })
  @IsString()
  pic_email: string;

  @ApiProperty({
    required: false,
    example: 'SL',
    description: 'Default Example: "SL"',
  })
  @IsString()
  source_created_at: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  nat_loc: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  status_desc_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  status_desc_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_1_status: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_2_status: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_date_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  approver_date_2: string;

  @ApiProperty({
    required: false,
    example: '1646546464646',
    description: '',
  })
  @MinLength(15)
  @MaxLength(16)
  @IsString()
  npwp: string;

  // @ApiProperty({
  //   required: true,
  //   example: '62ffe0208ff494affb56fef1',
  //   description: 'Data Source: <b>[GET]Accout endpoint</b><br />',
  // })
  // @IsString()
  // poin_created_by: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  is_visible: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  ktp: string;

  @ApiProperty({
    required: false,
    example: '21414',
    description: '',
  })
  @MinLength(16)
  @MaxLength(16)
  @IsString()
  pic_ktp: string;

  @ApiProperty({
    required: false,
    example: 'BCA',
    description: '',
  })
  @IsOptional()
  @IsString()
  bank_name: string;

  @ApiProperty({
    required: false,
    example: 'BCA',
    description: '',
  })
  @IsOptional()
  @IsString()
  bank_account_name: string;

  @ApiProperty({
    required: false,
    example: '214214214',
    description: '',
  })
  @IsOptional()
  @IsString()
  bank_account_number: string;

  @ApiProperty({
    required: false,
    example: 'TSPOIN',
    description: '',
  })
  apps_name: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  transaction_id: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  channel: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  id_business_type_1: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  id_business_type_2: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  callback_url: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  origin_data: string;

  @ApiProperty({
    example: 'url.com',
    description: '',
    required: false,
  })
  @IsString()
  merchant_logo: any;

  @ApiProperty({
    example: 'hyperlink-1.com',
    description: '',
    required: false,
  })
  @IsString()
  hyperlink_1: any;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Hyperlink 1 Title',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  hyperlink_1_title: MultiLang;

  @ApiProperty({
    example: 'hyperlink-2.com',
    description: '',
    required: false,
  })
  @IsString()
  hyperlink_2: any;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Hyperlink 2 Title',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  hyperlink_2_title: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Title 1',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  title_1: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Content 1',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  content_1: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Title 2',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  title_2: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Content 2',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  content_2: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Title 3',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  title_3: MultiLang;

  @ApiProperty({
    example: {
      id: '',
      en: '',
    },
    description: 'Content 3',
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MultiLang)
  content_3: MultiLang;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_type: string;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_area_identifier: string;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_region_identifier: string;
}

export class MerchantV2EditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_V2_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
