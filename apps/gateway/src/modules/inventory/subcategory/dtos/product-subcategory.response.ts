import { GlobalTransactionResponse } from "@/dtos/global.response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductSubcategoryAddResult } from "./product-subcategory-result.dto";
import { ProductSubcategoryDto, ProductSubcategorySingleDto } from "./product-subcategory.dto";

export class ProductSubcategoryResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductSubcategoryDto,
    description: "Payload of data product subcategory"
  })
  @Type(()=> ProductSubcategoryDto)
  payload: ProductSubcategoryDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT_SUBCATEGORY"
  })
  transaction_classify: string | "INVENTORY_PRODUCT_SUBCATEGORY"
}

export class ProductSubcategorySingleResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductSubcategorySingleDto,
    description: "Payload of data product subcategory"
  })
  payload: ProductSubcategorySingleDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT_SUBCATEGORY"
  })
  transaction_classify: string | "INVENTORY_PRODUCT_SUBCATEGORY"
}

export class ProductSubcategoryAddResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductSubcategoryAddResult,
    description: "Response of sucess add product subcategory"
  })
  @Type(() => ProductSubcategoryAddResult)
  payload: ProductSubcategoryAddResult;
}

export class ProductSubcategoryUpdateResponse extends GlobalTransactionResponse {
}
