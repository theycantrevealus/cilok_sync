import {ApiProperty} from "@nestjs/swagger"
import {IsString, MaxLength,} from "class-validator"

export class DisbursementCheckDTO {
  @ApiProperty({
    example: "rinitest24564",
    description: "Partner transaction id",
    required: true,
    maxLength: 25
  })
  @MaxLength(25)
  @IsString()
  partnerTrxID: string
}


