import { GlobalTransactionResponse } from "@/dtos/global.response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString } from "class-validator";
import { RewardCatalogueResponseDto } from "./reward-catalogue.response.dto";

export class RewardCatalogueResponse extends GlobalTransactionResponse {
  @ApiProperty({
    example: 'TRANSACTION_GET_REWARD_CATALOGUE_BY_SUBSRIBER',
    description: 'Transaction classification',
  })
  @IsString()
  transaction_classify: string;

  @ApiProperty({
    type: RewardCatalogueResponseDto
  })  
  @Type(() => RewardCatalogueResponseDto)
  payload: RewardCatalogueResponseDto;
}
