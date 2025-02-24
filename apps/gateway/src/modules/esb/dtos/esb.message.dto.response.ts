import { ApiProperty } from "@nestjs/swagger";

export class EsbMessageDtoReponse {
  @ApiProperty({
    description: "Additional description of status.",
    required: false
  })
  message : string;
}
