import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString } from "class-validator";
import { RewardCatalogueKeyword } from "./reward-catalogue.keyword"

export class RewardCatalogueResponseDto {
  @ApiProperty({
    required: false,
    description: "List rewards based on subscriber point",
    isArray: true,
    type: RewardCatalogueKeyword
  })
  @Type(() => RewardCatalogueKeyword)
  point: RewardCatalogueKeyword[];

  @ApiProperty({
    required: false,
    description: "List rewards based on transactions",
    isArray: true,
    type: RewardCatalogueKeyword
  })
  @Type(() => RewardCatalogueKeyword)
  transactions: RewardCatalogueKeyword[];

  @ApiProperty({
    required: false,
    description: "List rewards based on point sorting by lowest price",
    isArray: true,
    type: RewardCatalogueKeyword
  })
  @Type(() => RewardCatalogueKeyword)
  lowest_point: RewardCatalogueKeyword[];

  @ApiProperty({
    required: false,
    description: "Channel transaction id",
    type: String
  })
  @IsString()
  transaction_id: string;
}
