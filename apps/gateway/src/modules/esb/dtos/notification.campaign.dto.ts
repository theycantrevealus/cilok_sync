import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString } from "class-validator";
import { NotificationCharacteristicsDto } from "./notification.characteristics.dto";
import { NotificationIdentificationDto } from "./notification.identification.dto";
import { NotificationOffersDto } from "./notification.offers.dto";
import { NotidicationPropertiesDto } from "./notification.properties.dto";

export class NotificationCampaignDto {
  @ApiProperty({
    description: "Offer Tracking ID",
    required : false
  })
  @IsString()
  offer_tracking_id : string;

  @ApiProperty({
    description: "Offer Tracking ID",
    required : false,
    isArray: true,
    type: NotificationIdentificationDto
  })
  @Type(() => NotificationIdentificationDto)
  identification : NotificationIdentificationDto[];

  @ApiProperty({
    description: "Offer Tracking ID",
    required : false,
    isArray: true,
    type: NotidicationPropertiesDto
  })
  @Type(() => NotidicationPropertiesDto)
  properties: NotidicationPropertiesDto[];

  @ApiProperty({
    description: "Offer Tracking ID",
    required : false,
    isArray: true,
    type: NotificationCharacteristicsDto
  })
  @Type(() => NotificationCharacteristicsDto)
  characteristics: NotificationCharacteristicsDto[];

  @ApiProperty({
    description: "Offer Tracking ID",
    required : false,
    isArray: true,
    type: NotificationOffersDto
  })
  @Type(() => NotificationOffersDto)
  offers : NotificationOffersDto[];
}
