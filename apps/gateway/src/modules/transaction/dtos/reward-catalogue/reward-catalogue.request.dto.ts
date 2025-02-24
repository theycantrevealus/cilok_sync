import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { RewardCalaogueQueryDTO } from "./reward-catalogue.query";

export class RewardCatalogueRequestDto {
  /**
   * msisdn is a path or params
   */
  msisdn: string;

  /**
  * query is a object for query params
  */
  @Type(() => RewardCalaogueQueryDTO)
  query: RewardCalaogueQueryDTO;

  /**
   * token is bearer token to request core api
   */
  token: string;
}
