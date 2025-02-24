import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";

export class ProductAttributeRequestDto {
  @ApiProperty({
    name: "keyword",
    description: "Attribute Keyword",
    example: "color",
    type: String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({
    name: "value",
    description: "Attribute value",
    example: "Black",
    type: String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  value: string;
}
