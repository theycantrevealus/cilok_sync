import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class NotificationOffersDto {
  @ApiProperty({
    description: "Offer ID",
    required: false
  })
  @IsString()
  id : string;
  
  @ApiProperty({
    description: "Offer Description",
    required: false
  })
  @IsString()
  description: string;
  
  @ApiProperty({
    description: "Product ID",
    required: false
  })
  @IsString()
  product_id: string;
  
  @ApiProperty({
    description: "Product Description",
    required: false
  })
  @IsString()
  product_description: string;
  
  @ApiProperty({
    description: "Offer Promo Text",
    required: false
  })
  @IsString()
  promo_text: string;
}
