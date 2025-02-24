import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RewardCatalogueKeyword {
  @ApiProperty({
    required: false,
    description: "Eligible keyword based on subscriber point"
  })
  @IsString()
  keyword: string;
}
