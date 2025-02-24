import { GlobalTransactionResponse } from "@/dtos/response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsISO8601, IsString } from "class-validator";
import { DetailVoteResponseDTO, VoteOptionDTO } from "./vote.single.response";

export class DetailVoteResultResponseDTO {
  @ApiProperty({ description: 'Program ID', example: '6690b0a839657da790ad464d' })
  @IsString()
  program_id: string;

  @ApiProperty({ description: 'Program Name', example: 'VOTINGHAPPYEND1' })
  @IsString()
  program_name: string;

  @ApiProperty({ description: 'Keyword ID', example: '669898f0fdcbc5f7c703ccb4' })
  @IsString()
  keyword_id: string;

  @ApiProperty({ description: 'Keyword Name', example: 'VOTINGHAPPYEND1' })
  @IsString()
  keyword_name: string;

  @ApiProperty({
    description: 'Voting End Date, format will be in GMT +07',
    example: '2024-12-22T16:59:59.999+07:00',
  })
  @IsISO8601()
  end_time: string;

  @ApiProperty({
    description: 'List of vote options',
    type: [VoteOptionDTO], // Array of VoteOptionDTO
  })
  @IsArray()
  @Type(() => VoteOptionDTO)
  vote_options: VoteOptionDTO[];

  @ApiProperty({ description: 'Msisdn' })
  msisdn?: string[];
}

export class VoteResultResponseDto extends GlobalTransactionResponse {
  @ApiProperty({
    type: [DetailVoteResultResponseDTO],
    description: 'Return data from process that may useful for you',
  })
  @IsArray()
  @Type(() => DetailVoteResultResponseDTO)
  payload: DetailVoteResultResponseDTO;
}
