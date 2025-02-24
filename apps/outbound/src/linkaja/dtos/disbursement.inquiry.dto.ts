import {ApiProperty} from "@nestjs/swagger"
import {IsNumber, IsString, MaxLength} from "class-validator"

export class DisbursementInquiryDTO {
  @ApiProperty({
    example: "6281376464979",
    description: "Customer MSISDN (62xx)",
    required: true
  })
  @IsString()
  customerNumber: string

  @ApiProperty({
    example: 10,
    description: "Transaction amount, ex : 20000",
    required: true
  })
  @IsNumber()
  amount: number

  @ApiProperty({
    example: "rinitest24564",
    description: "ISO 8601 ʹdatetime with time zone (format: yyyy-MM-dd HH:mm:ss+07:00)",
    required: true,
    maxLength: 25
  })
  @IsString()
  @MaxLength(25)
  partnerTrxID: string;

  @ApiProperty({
    example: "2022-03-11T10:30:31+07:00",
    description: "Partner transaction id",
    required: true,
    maxLength: 25
  })
  @IsString()
  @MaxLength(25)
  partnerTrxDate: string;

}


