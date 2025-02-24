import { GlobalTransactionResponse } from "@/dtos/global.response.transaction.dto";
import { ApiProperty } from "@nestjs/swagger";
import { ProductAddResult } from "./product-result.dtos";
import { ProductDto, ProductSingleDto } from "./product.dto";
export class ProductResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductDto,
    description: "Payload of data product"
  })
  payload: ProductDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT"
  })
  transaction_classify: string | "INVENTORY_PRODUCT"
}

export class ProductSingleResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductSingleDto,
    description: "Payload of data product"
  })
  payload: ProductSingleDto;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT"
  })
  transaction_classify: string;
}


export class ProductAddAndUpdateResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: ProductAddResult,
    description: "Payload of data product"
  })
  payload: ProductAddResult;

  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT"
  })
  transaction_classify: string;
}

export class ProductUpdateResponse extends GlobalTransactionResponse {
  @ApiProperty({
    type: String,
    description : "Transaction classification",
    example: "INVENTORY_PRODUCT"
  })
  transaction_classify: string;
}
