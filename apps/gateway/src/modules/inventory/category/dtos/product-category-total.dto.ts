import { ApiProperty } from "@nestjs/swagger";

export class ProductCategoryTotal {
  @ApiProperty({
    description : "count of product categories",
    type: Number
  })
  count : number;
}
