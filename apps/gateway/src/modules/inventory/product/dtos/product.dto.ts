import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductListDto } from "./product-list.dto";
import { ProductResultDto } from "./product-result.dtos";

export class ProductDto {
  @ApiProperty({
    description: "Data product",
    isArray: true,
    type: ProductListDto
  })
  @Type(() => ProductListDto)
  products : ProductListDto[]
}

export class ProductSingleDto {
  @ApiProperty({
    description: "Data product",
    type: ProductResultDto
  })
  @Type(() => ProductResultDto)
  products : ProductResultDto
}
