import { GlobalTransactionResponse } from "@/dtos/response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsInt, IsISO8601, IsNumber, IsString } from "class-validator";

export class MyVoteDetailListDTO {
  @ApiProperty({ description: 'ID of the vote option', example: '66b1c17b6199ab98c0e1920c' })
  @IsString()
  _id: string;
  
  @ApiProperty({ description: 'Total votes for the option', example: 98 })
  @IsInt()
  total_vote: number;

  @ApiProperty({ description: 'Total points for the option', example: 490 })
  @IsInt()
  total_point: number;

  @ApiProperty({ description: 'Voting option text', example: 'Tidak' })
  @IsString()
  option: string;

  @ApiProperty({ description: 'Description of the option', example: 'Tidak' })
  @IsString()
  description: string;
}

export class MyVoteDetailDTO {
  @ApiProperty({ description: 'Program ID', example: '66a893e31df41ecf703dd15e' })
  @IsString()
  program_id: string;

  @ApiProperty({ description: 'Program Name', example: 'VOTFIXMUL060824' })
  @IsString()
  program_name: string;

  @ApiProperty({ description: 'Keyword ID', example: '66b1c16e81125a2ca19c2027' })
  @IsString()
  keyword_id: string;

  @ApiProperty({ description: 'Keyword Name', example: 'VOTFIXMUL060824' })
  @IsString()
  keyword_name: string;


  @ApiProperty({
    description: 'Voting End Date, format will be in GMT +07',
    example: '2024-12-22T16:59:59.999+07:00',
  })
  @IsISO8601()
  end_time: string;

  @ApiProperty({ description: 'Total Points', example: 500 })
  @IsInt()
  total_point: number;

  @ApiProperty({ description: 'Total Votes', example: 100 })
  @IsInt()
  total_vote: number;

  @ApiProperty({
    description: 'List of vote details',
    type: [MyVoteDetailListDTO], // Array of MyVoteDetailListDTO
  })
  @IsArray()
  votes: MyVoteDetailListDTO[];
}


export class PaginatedMyVoteResponseDTO {
  @ApiProperty({ description: 'Total records in response', example: 100 })
  @IsInt()
  page_size: number;

  @ApiProperty({
    description: 'List of Votes',
    type: [MyVoteDetailDTO], // Array of CreateVoteDTO
  })
  @IsArray()
  @Type(() => MyVoteDetailDTO)
  list_of_vote: MyVoteDetailDTO[];

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

export class MyVoteResponseDto extends GlobalTransactionResponse {
  @ApiProperty({
    type: PaginatedMyVoteResponseDTO,
    description: 'Return data from process that may useful for you',
  })
  @Type(() => PaginatedMyVoteResponseDTO)
  payload: PaginatedMyVoteResponseDTO;
}
