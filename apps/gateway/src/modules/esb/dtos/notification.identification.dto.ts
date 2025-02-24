import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class NotificationIdentificationDto {
  @ApiProperty({
    description : "Campaign ID",
    required: false
  })
  @IsString()
  campaign_id: string;
  
  @ApiProperty({
    description : "Campaign Name",
    required: false
  })
  @IsString()
  name: string;
  
  @ApiProperty({
    description : "Short description of campaign",
    required: false
  })
  @IsString()
  short_description: string;
  
  @ApiProperty({
    description : "Long description of campaign",
    required: false
  })
  @IsString()
  long_description: string;
  
  @ApiProperty({
    description : "Campaign Start Date",
    required: false
  })
  @IsString()
  start_on: string;
  
  @ApiProperty({
    description : "Campaign Start Date",
    required: false
  })
  @IsString()
  end_on: string;
  
  @ApiProperty({
    description : "Campaign Context",
    required: false
  })
  @IsString()
  campaign_context: string;
}
