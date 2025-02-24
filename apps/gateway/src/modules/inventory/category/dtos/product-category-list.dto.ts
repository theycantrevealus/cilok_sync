import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductCategoryResultDto } from "./product-category-result.dto";
import { ProductCategoryTotal } from "./product-category-total.dto";

export class ProductCategoryListDto {
  @ApiProperty({
    isArray: true,
    type : ProductCategoryTotal,
    required: false
  })
  @Type(() => ProductCategoryTotal)
  total : ProductCategoryTotal[];

  @ApiProperty({
    isArray: true,
    type : ProductCategoryResultDto
  })
  @Type(() => ProductCategoryResultDto)
  result: ProductCategoryResultDto[]
}

