import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class OrderMerchantProfileDto {
  @ApiProperty({
    description: "Merchant signature. To be used by URP partner.",
    required: false
  })
  @IsString()
  merchant_signature: string;
  
  @ApiProperty({
    description: "Merchant CAI.",
    required: false
  })
  @IsString()
  cai: string;
  
  @ApiProperty({
    description: "Merchant CATI.",
    required: false
  })
  @IsString()
  cati: string;
  
  @ApiProperty({
    description: "Merchant CAN.",
    required: false
  })
  @IsString()
  can: string;
  
  @ApiProperty({
    description: "Merchant Source of Fund.",
    required: false
  })
  @IsString()
  fund_source: string;
  
  @ApiProperty({
    description: "Merchant Address (Alamat).",
    required: false
  })
  @IsString()
  address: string;
  
  @ApiProperty({
    description: "Merchant Postal Code (Kode Pos).",
    required: false
  })
  @IsString()
  postcode: string;
  
  @ApiProperty({
    description: "Merchant District (Kecamatan).",
    required: false
  })
  @IsString()
  district: string;
  
  @ApiProperty({
    description: "Merchant Store ID.",
    required: false
  })
  @IsString()
  store_id: string;
  
  @ApiProperty({
    description: "Merchant City (Kota).",
    required: false
  })
  @IsString()
  city: string;
  
  @ApiProperty({
    description: "Merchant Coordinate Location. Format is [Latitude],[Longitude].",
    required: false,
    example: "-6.231210,106.817745"
  })
  @IsString()
  coordinate: string;
  
  @ApiProperty({
    description: "Merchant Delivery Channel.",
    required: true
  })
  @IsString()
  @IsNotEmpty()
  delivery_channel: string;
  
  @ApiProperty({
    description: "Merchant Transmission Date format in YYYYMMDDhhmmss.",
    required: false,
    example: "20190924135839"
  })
  @IsString()
  transmission_date: string;
  
  @ApiProperty({
    description: "Reserved Field 1.",
    required: false
  })
  @IsString()
  field1: string;
  
  @ApiProperty({
    description: "Reserved Field 2.",
    required: false
  })
  @IsString()
  field2: string;
  
  @ApiProperty({
    description: "Reserved Field 3.",
    required: false
  })
  @IsString()
  field3: string;
  
  @ApiProperty({
    description: "Reserved Field 4.",
    required: false
  })
  @IsString()
  field4: string;
  
  @ApiProperty({
    description: "Reserved Field 5.",
    required: false
  })
  @IsString()
  field5: string;
  
  @ApiProperty({
    description: "Fund Type.",
    required: false
  })
  @IsString()
  fund_type: string;
  
  @ApiProperty({
    description: "Business Model.",
    required: false
  })
  @IsString()
  business_model: string;
}
