import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { NotificationCampaignDto } from "./notification.campaign.dto";
import { NotificationViralbonusDto } from "./notification.viralbonus.dto";

export class NotificationInboxDto {
  @ApiProperty({
    description: "Inbox ID.",
    example: "367334173",
    required: false
  })
  @IsString()
  id: string; // kebutuhan untuk retry push notif esb
  
  @ApiProperty({
    description: "Content of inbox",
    example: "Pasti lebih murah! Paket Best Deal mulai dr 110rb dapatkan kuota internet 27GB/30hr 24 Jam di semua jaringan.",
    required: true
  })
  @IsString()
  @IsNotEmpty()
  content: string;
  
  @ApiProperty({
    description: "Language. E.g. id or en",
    example: "id",
    required: false
  })
  @IsString()
  language: string;
  
  @ApiProperty({
    description: "Timestamp. Format: YYYY- MM-DD hh:mm:ss.",
    example: "2017-03-26 21:20:04",
    required: false
  })
  @IsString()
  timestamp: string;
  
  @ApiProperty({
    description: "Source.",
    example: "ContactProtocol",
    required: false
  })
  @IsString()
  source: string;
  
  @ApiProperty({
    description: "Service Name.",
    example: "DigitalNotification",
    required: false
  })
  @IsString()
  service: string;
  
  @ApiProperty({
    description: "Operation.",
    example: "PurchaseOffer",
    required: false
  })
  @IsString()
  operation: string;
  
  @ApiProperty({
    description: "Status",
    example: "Success",
    required: false
  })
  @IsString()
  status: string;
  
  @ApiProperty({
    description: "Title of Inbox.",
    example: "Best Deal Telkomsel!",
    required: false
  })
  @IsString()
  title: string;
  
  @ApiProperty({
    description: "Type of Message.",
    example: "PROMO",
    required: false
  })
  @IsString()
  type: string;
  
  @ApiProperty({
    description: "Deep link.",
    example: "OFFER",
    required: false
  })
  @IsString()
  deeplink: string;
  
  @ApiProperty({
    description: "Deep link category.",
    example: "ML2_BP_14",
    required: false
  })
  @IsString()
  deeplink_category: string;
  
  @ApiProperty({
    description: "Entity ID.",
    example: "ML4_BP_1311",
    required: false
  })
  @IsString()
  entity_id: string;
  
  @ApiProperty({
    description: "Entity name.",
    example: "SMS Mania",
    required: false
  })
  @IsString()
  entity_name: string;
  
  @ApiProperty({
    description: "External Content ID.",
    example: "",
    required: false
  })
  @IsString()
  external_content_id: string;

  @ApiProperty({
    description: "Campaign",
    required: false
  })
  @Type(() => NotificationCampaignDto)
  campaign : NotificationCampaignDto;

  @ApiProperty({
    description: "Viral Bonus",
    required: false
  })
  @Type(() => NotificationViralbonusDto)
  viral_bonus : NotificationViralbonusDto;

  @ApiProperty({
    description: "Maximum delivery.",
    example: 10,
    required: false
  })
  @IsNumber()
  max_delivery: number;
  
  @ApiProperty({
    description: "Delivery counter.",
    example: 0,
    required: false
  })
  @IsNumber()
  delivery_count: number;
}
