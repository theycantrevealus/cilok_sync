import { GlobalTransactionResponse } from "@/dtos/response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsInt, IsArray, IsISO8601 } from "class-validator";

export class VoteOptionDTO {
  @ApiProperty({ description: 'ID of the vote option', example: '669899256199ab98c048ed0d' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Title of the vote option', example: 'a' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the vote option', example: 'a' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Point assigned to the vote option', example: 1 })
  @IsInt()
  point: number;

  @ApiProperty({ description: 'Vote count for the option', example: 1 })
  @IsInt()
  vote: number;
}

export class DetailVoteResponseDTO {
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

  @ApiProperty({ description: 'Total Points', example: 2 })
  @IsInt()
  total_point: number;

  @ApiProperty({ description: 'Total Votes', example: 2 })
  @IsInt()
  total_vote: number;
  
  @ApiProperty({
    description: 'List of vote options',
    type: [VoteOptionDTO], // Array of VoteOptionDTO
  })
  @IsArray()
  @Type(() => VoteOptionDTO)
  vote_options: VoteOptionDTO[];
}

export class VoteResponseSingleDto extends GlobalTransactionResponse {
  @ApiProperty({
    type: [DetailVoteResponseDTO],
    description: 'Return data from process that may useful for you',
  })
  @IsArray()
  @Type(() => DetailVoteResponseDTO)
  payload: DetailVoteResponseDTO[];
}
