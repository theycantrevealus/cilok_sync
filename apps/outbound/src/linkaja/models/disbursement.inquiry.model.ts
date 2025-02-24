import {ApiProperty} from "@nestjs/swagger"
import {Type} from "class-transformer"
import {string} from "yargs"

export class DisbursementInquiry {
  @ApiProperty({
    required: true,
  })
  @Type(() => string)
  customerNumber: string

  @ApiProperty({
    required: false,
  })
  @Type(() => string)
  amount: string

  @ApiProperty({
    required: false,
  })
  @Type(() => string)
  partnerTrxID: string

  @ApiProperty({
    required: false,
  })
  @Type(() => string)
  partnerTrxDate: string

}
