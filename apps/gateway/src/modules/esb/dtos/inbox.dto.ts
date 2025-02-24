import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class InboxDto {
  @ApiProperty({
    example: "PROMO",
    description: "Type of Message. E.g. PROMO",
    required: false
  })
  @IsString()
  type: string;
  
  @ApiProperty({
    example: "",
    description: "Inbox Category",
    required: false
  })
  @IsString()
  category: string;
  
  @ApiProperty({
    example: "",
    description: "Inbox Subcategory",
    required: false
  })
  @IsString()
  subcategory: string;
  
  @ApiProperty({
    example: "Best Deal Telkomsel!",
    description: "Title of Inbox. E.g. Best Deal Telkomsel!",
    required: false
  })
  @IsString()
  title: string;
  
  @ApiProperty({
    example: "Pasti lebih murah! Paket Best Deal mulai dr 110rb dapatkan kuota internet 27GB/30hr 24 Jam di semua jaringan.",
    description: "Content of inbox. E.g. Pasti lebih murah! Paket Best Deal mulai dr 110rb dapatkan kuota internet 27GB/30hr 24 Jam di semua jaringan.",
    required: false
  })
  @IsString()
  content: string;
  
  @ApiProperty({
    example: "id",
    description: "Language. E.g. id",
    required: false
  })
  @IsString()
  language: string;
  
  @ApiProperty({
    example: "ContactProtocol",
    description: "Source. E.g. ContactProtocol",
    required: false
  })
  @IsString()
  source: string;
  
  @ApiProperty({
    example: "DigitalNotification",
    description: "Service Name. E.g. DigitalNotification",
    required: false
  })
  @IsString()
  service: string;
  
  @ApiProperty({
    example: "2018-10-19 14:04:14",
    description: "Timestamp. Format: YYYY- MM-DD hh:mm:ss. E.g. 2018-10-19 14:04:14",
    required: false
  })
  @IsString()
  timestamp: string;
  
  @ApiProperty({
    example: "OFFER",
    description: "Deep link. E.g. OFFER",
    required: false
  })
  @IsString()
  deeplink: string;
  
  @ApiProperty({
    example: "HOT OFFERS",
    description: "Deep link category. E.g. HOT OFFERS",
    required: false
  })
  @IsString()
  deeplink_category: string;

  @ApiProperty({
    example: "",
    description: "Entity ID.",
    required: false
  })
  @IsString()
  entity_id: string;
  
  @ApiProperty({
    example: "",
    description: "External Content ID.",
    required: false
  })
  @IsString()
  external_content_id: string;
  
  @ApiProperty({
    example: "",
    description: "Campaign XML",
    required: false
  })
  @IsString()
  campaign_xml: string;

  @ApiProperty({
    example: "false",
    description: "Inbox read flag. E.g. false",
    required: false
  })
  @IsString()
  read_flag: string;
  
  @ApiProperty({
    example: "false",
    description: "Inbox deleted flag. E.g. false",
    required: false
  })
  @IsString()
  deleted_flag: string;
  
  @ApiProperty({
    example: "D181019ABRAB702",
    description: "Campaign ID.",
    required: false
  })
  @IsString()
  campaign_id: string;
  
  @ApiProperty({
    example: "939938fa-e789-4e35- 8c91-6acdfc530528",
    description: "Campaign tracking ID.",
    required: false
  })
  @IsString()
  campaign_tracking_id: string;
  
  @ApiProperty({
    example: "v2",
    description: "API Insert Inbox version for response structure.",
    required: false
  })
  @IsString()
  version: string;
  
}
