import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class OrderActiveMemberDTO {
  @ApiProperty({
    description : "Child MSISDN.",
    required: true
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    description : "Value of quota cap (in KB).",
    required: false
  })
  @IsString()
  cap_value: string;
}
