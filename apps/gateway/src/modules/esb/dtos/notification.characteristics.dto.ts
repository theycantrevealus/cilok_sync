import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class NotificationCharacteristicsDto {
  @ApiProperty({
    description: "Characteristics Name",
    required : false
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Characteristics Value",
    required : false
  })
  @IsString()
  value: string;
}
