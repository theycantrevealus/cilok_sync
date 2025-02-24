import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductResultDto } from "./product-result.dtos";
import { ProductTotalDto } from "./product-total.dto";


export class ProductListDto {
  @ApiProperty({
    isArray: true,
    type : ProductTotalDto,
    required: false
  })
  @Type(() => ProductTotalDto)
  total : ProductTotalDto[];

  @ApiProperty({
    isArray: true,
    type : ProductResultDto
  })
  @Type(() => ProductResultDto)
  result: ProductResultDto[]
}

