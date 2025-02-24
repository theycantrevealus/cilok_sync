import { ApiProperty } from "@nestjs/swagger";

export class EsbTransactionResponse {
  @ApiProperty({
    description: "Transaction ID. Refer to section 2.4 for the format."
  })
  transaction_id: string;

  @ApiProperty({
    description: "Channel ID. Refer to section 2.7 of the document for list of values."
  })
  channel: string;

  @ApiProperty({
    description: "Status Code. Refer to section 2.6 for status codes."
  })
  status_code: string;

  @ApiProperty({
    description: "Status Description."
  })
  status_desc: string;
}
