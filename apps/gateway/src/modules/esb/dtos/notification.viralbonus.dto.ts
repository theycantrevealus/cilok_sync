import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class NotificationViralbonusDto {
  @ApiProperty({
    description: "Viral bonus class",
    example: "sms",
    required: false
  })
  @IsString()
  viral_class: string;
  
  @ApiProperty({
    description: "Viral bonus description.",
    example: "SMS Tsel",
    required: false
  })
  @IsString()
  viral_description: string;
  
  @ApiProperty({
    description: "Viral bonus quota.",
    example: "300",
    required: false
  })
  @IsString()
  viral_quota: string;
  
  @ApiProperty({
    description: "Viral bonus unit.",
    example: "SMS",
    required: false
  })
  @IsString()
  viral_unit: string;
}
