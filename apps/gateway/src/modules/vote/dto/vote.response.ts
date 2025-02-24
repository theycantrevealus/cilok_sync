import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsISO8601, IsNumber, isNumber, IsString } from 'class-validator';
import { number } from 'yargs';

export class ListVoteResponseDTO {
  @ApiProperty({ description: 'Program ID', example: '6690b0a839657da790ad464d' })
  @IsString()
  program_id: string;

  @ApiProperty({ description: 'Program Name', example: 'Sample Program' })
  @IsString()
  program_name: string;

  @ApiProperty({ description: 'Keyword ID', example: 'kw_123' })
  @IsString()
  keyword_id: string;

  @ApiProperty({ description: 'Keyword Name', example: 'Keyword Sample' })
  @IsString()
  keyword_name: string;

  @ApiProperty({
    description: 'Voting End Date, format will be in GMT +07',
    example: '2024-12-22T16:59:59.999+07:00',
  })
  @IsISO8601()
  end_time: string;

  @ApiProperty({ description: 'Total Target Voting', example: 1000 })
  @IsInt()
  target_votes: number;

  @ApiProperty({ description: 'Total Current Voting', example: 500 })
  @IsInt()
  current_votes: number;
}


export class PaginatedVoteResponseDTO {
  @ApiProperty({ description: 'Total records in response', example: 100 })
  @IsInt()
  page_size: number;

  @ApiProperty({
    description: 'List of Votes',
    type: [ListVoteResponseDTO], // Array of CreateVoteDTO
  })
  @IsArray()
  @Type(() => ListVoteResponseDTO)
  list_of_vote: ListVoteResponseDTO[];

  // @ApiProperty({
  //   description: "Total record data",
  //   type : Number,
  //   example: 100
  // })
  // @IsNumber()
  // total_record?: number;

  // @ApiProperty({
  //   description: "number current page",
  //   type : Number,
  //   example: 1
  // })
  // page_number?: number;
}

export class VoteResponseDto extends GlobalTransactionResponse {
  @ApiProperty({
    type: PaginatedVoteResponseDTO,
    description: 'Return data from process that may useful for you',
  })
  @Type(() => PaginatedVoteResponseDTO)
  payload: PaginatedVoteResponseDTO;
}

