import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class OrderCustomerInfoDto {
  @ApiProperty({
    description: "Customer name"
  })
  @IsString()
  customer_name: string;

  @ApiProperty({
    description: "Customer Email"
  })
  @IsString()
  customer_email: string;
}
