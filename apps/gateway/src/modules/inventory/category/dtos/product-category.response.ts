import { GlobalTransactionResponse } from "@/dtos/global.response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { ProductCategoryAddRelust } from "./product-category-result.dto";
import { ProductCategoryDto, ProductCategorySingleDto } from "./product-category.dto";

export class ProductCategoryResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductCategoryDto,
    description: "Payload of data product category"
  })
  payload: ProductCategoryDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT_CATEGORY"
  })
  transaction_classify: string | "INVENTORY_PRODUCT_CATEGORY"
}

export class ProductCategorySingleResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductCategorySingleDto,
    description: "Payload of data product category"
  })
  payload: ProductCategorySingleDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT_CATEGORY"
  })
  transaction_classify: string | "INVENTORY_PRODUCT_CATEGORY"
}

export class ProductCategoryAddResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductCategoryAddRelust,
    description: "Response of sucess add product category"
  })
  payload: ProductCategoryAddRelust;
}

export class ProductCategoryUpdateResponse extends GlobalTransactionResponse {
}
