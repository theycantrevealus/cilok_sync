import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class OrderExpiryDto {
  @ApiProperty({
    description: "Transaction expiry duration, refer to uom parameter value for the measurement.",
    required: true
  })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiProperty({
    description: "Unit of measurement of expiry/duration. LOV: seconds, minutes, hour",
    required: true,
    enum: ["seconds", "minutes", "hour"],
  })
  @IsString()
  @IsNotEmpty()
  uom: string;
}
