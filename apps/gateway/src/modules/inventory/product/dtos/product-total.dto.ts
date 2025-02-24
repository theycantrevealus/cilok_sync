import { ApiProperty } from "@nestjs/swagger";

export class ProductTotalDto {
  @ApiProperty({
    description : "count of product categories",
    type: Number
  })
  count : number;
}
