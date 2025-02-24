import {ApiProperty} from "@nestjs/swagger"
import {IsString} from "class-validator"
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto"
import {Type} from "class-transformer"

export class GetTokenDTO {
  @ApiProperty({
    example: "Testmch",
    description: "Partner Name on LinkAja system",
    required: true
  })
  @IsString()
  organizationName: string

  @ApiProperty({
    example: "BearerToken",
    description: "BearerToken",
    required: true
  })
  @IsString()
  tokenType: string

  @ApiProperty({
    example: "yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx",
    description: "Result of generate access token",
    required: true
  })
  @IsString()

  accessToken: string

  @ApiProperty({
    example: "yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx",
    description: "Resultof generate refresh token, used to regenerate token for transaction ",
    required: true
  })
  @IsString()
  refreshToken: string

  @ApiProperty({
    example: "1647005543000",
    description: "Datetime when the token was generated",
    required: true
  })
  @IsString()
  issueDate: string

  @ApiProperty({
    example: "3599999",
    description: "Token expired time3599999ms = 3600s (1 hour)",
    required: true
  })
  @IsString()
  expiredIn: string

}

export class LinkAjaDisbursementDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description: "Response of the value"
  })
  @Type(() => GetTokenDTO)
  payload: GetTokenDTO

  @ApiProperty({
    example: "00",
    description: "Status code of an API Call",
    required: false
  })
  @IsString()
  code: string
}
