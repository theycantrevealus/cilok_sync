import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Max, Min } from "class-validator";

export class InboxServiceDto {
  @ApiProperty({
    example: "6281315900140",
    description: "MSISDN starts with “62” for Indonesia calling code. Refer to section 2.4 for MSISDN format. E.g. 6281315900140",
    required: false
  })
  @IsString()
  @Min(11)
  @Max(13)
  service_id: string;

  @ApiProperty({
    example: "a0250b4e628afe82",
    description: "Device ID. E.g. a0250b4e628afe82",
    required: false
  })
  @IsString()
  device_id: string;
}
