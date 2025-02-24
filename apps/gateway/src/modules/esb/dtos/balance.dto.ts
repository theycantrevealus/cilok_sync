import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";


export class BalanceDto {
  @ApiProperty({
    example: "BULK",
    description: "Name of balance",
    required: false,
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: "IDR",
    description: "Currency of balance",
  })
  @IsString()
  currency: string;

  @ApiProperty({
    example: "150000",
    description: "Value of balance",
  })
  @IsString()
  value: string;
}
