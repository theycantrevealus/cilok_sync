import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class NotificationTransactionDto {
  @ApiProperty({
    example: "C002180917103800199001400",
    description: 'Transaction ID. Refer to section 2.4 for the format.',
    required: false
  })
  @IsString()
  @Length(25)
  transaction_id: string;

  @ApiProperty({
    example: "i1",
    description: 'Channel ID. Refer to section 2.7 of the document for list of values.',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  channel: string; // form API reedim
}
