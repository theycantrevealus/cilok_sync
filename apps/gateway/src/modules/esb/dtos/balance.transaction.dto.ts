import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsString, Length} from "class-validator";

export class BalanceTransactionDto {
  @ApiProperty({
    example: "1234567890987654321234567",
    description: "Transaction ID, Leng 25",
  })
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @ApiProperty({
    example: "c1",
    description: "Channel ID.",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  channel: string;

  @ApiProperty({
    example: "000000",
    description: "ESB response status code",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  status_code: string;

  @ApiProperty({
    example: "No eligible offer for the requested organization",
    description: "Description for ESB status code",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  status_desc: string;

}
