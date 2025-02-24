import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ProductDiscountRequestDto {
  @ApiProperty({
    name: "type",
    description: "Discount Type",
    type: String,
    enum: ["Value", "Percent"]
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  type: string;
  
  @ApiProperty({
    name: "value",
    description: "Discount Value",
    example: 1,
    type: Number
  })
  @IsNumber()
  @IsDefined()
  @IsNotEmpty()
  value: number;
  
  @ApiProperty({
    name: "start_time",
    description: "Date/Time <refer to ISO 8601 Date/Time Format>", 
    type: Date,
    example: "2022-01-01T00:00:00.000Z"
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  start_time: string;
  
  @ApiProperty({
    name: "end_time",
    description: "Date/Time <refer to ISO 8601 Date/Time Format>", 
    type: Date,
    example: "2022-12-31T00:00:00.000Z"
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  end_time: string;
}

