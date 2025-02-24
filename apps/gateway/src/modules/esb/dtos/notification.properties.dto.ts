import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class NotidicationPropertiesDto {
  @ApiProperty({
    description: "Properties Name",
    required : false
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Properties Value",
    required : false
  })
  @IsString()
  value: string;
}
