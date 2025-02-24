import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class ProductPeriodRequestDto {
  @ApiProperty({
    name: "month",
    description: "Period Month",
    type: Number,
    required: false
  })
  @IsNumber()
  month: number;
  
  @ApiProperty({
    name: "year",
    description: "Period Year",
    type: Number,
    required: false
  })
  @IsNumber()
  year: number;
}
