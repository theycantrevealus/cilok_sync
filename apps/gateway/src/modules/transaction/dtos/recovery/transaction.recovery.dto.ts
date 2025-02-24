import {IsArray, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class TransactionRecoveryDto {
  //@ApiProperty({
  //  required: true,
  //  example: '[ "point_owner", "gross_revenue" ]',
  //  description: 'Select report want to recover / recounting'
  //})
  //@IsArray()
  //selected_reports: Array<string>;

  @ApiProperty({
    required: true,
    example: '["All", "Success", "Partial", "Fail"]',
    description: 'If select "All", every option will be ignored'
  })
  @IsArray()
  selected_status: Array<string>;

  @ApiProperty({
    required: false,
    example: '2023-06-01'
  })
  @IsString()
  start_date: string;

  @ApiProperty({
    required: false,
    example: '2023-06-30'
  })
  @IsString()
  end_date: string;
}
