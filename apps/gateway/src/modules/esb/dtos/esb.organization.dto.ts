import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsString, Length} from "class-validator";

export class EsbOrganizationDto {
  @ApiProperty({
    example: "ORG999",
    description: "Organization code",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 24)
  organization_code: string;

  @ApiProperty({
    example: "Organization 999",
    description: "Description of organization code",
    required: false,
  })
  @Length(2, 24)
  organization_name: string;
}
