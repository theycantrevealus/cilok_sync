import {ApiProperty} from "@nestjs/swagger"
import {IsString} from "class-validator"
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto"

export class CrmbResponseDTO extends SetConfigDTOResponse {
  @ApiProperty({
    description: "Response of the value"
  })
  payload: any

  @ApiProperty({
    example: "00",
    description: "Status code of an API Call",
    required: false
  })
  @IsString()
  code: string
}
