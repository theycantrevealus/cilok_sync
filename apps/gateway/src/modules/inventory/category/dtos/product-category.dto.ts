import { InventoryPrimaryDto, InventoryPrimaryUpdateDto } from "@/inventory/dtos/inventory-primary.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ProductCategoryListDto } from "./product-category-list.dto";
import { ProductCategoryResultDto } from "./product-category-result.dto";

export class ProductCategoryDto {
  @ApiProperty({
    description: "Data product category",
    isArray: true,
    type: ProductCategoryListDto
  })
  @Type(() => ProductCategoryListDto)
  product_categories: ProductCategoryListDto[]
}

export class ProductCategorySingleDto {
  @ApiProperty({
    description: "Data product category",
    isArray: true,
    type: ProductCategoryResultDto
  })
  @Type(() => ProductCategoryResultDto)
  product_categories: ProductCategoryResultDto
}

export class ProductCategoryRequestDto extends InventoryPrimaryDto {
  @ApiProperty({
    name: "locale",
    description: "Locale code for the response (ex. en-US, th-TH)",
    example : "",
    type : String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  locale: string;
  
  @ApiProperty({
    name: "name",
    description: "Product category name",
    example : "",
    type : String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  name: string;
  
  @ApiProperty({
    name: "desc",
    description: "Product category description",
    example : "",
    type : String,
    required: false
  })
  @IsString()
  desc: string;
  
  @ApiProperty({
    name: "status",
    description: "Product category status, status can be : <ul><li>Active</li><li>inactive</li></ul>",
    enum: ["Active", "inactive"],
    example : "Active",
    type : String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  status: string;
}

export class ProductCategoryUpdateRequestDto extends InventoryPrimaryUpdateDto{
  @ApiProperty({
    name: "locale",
    description: "Locale code for the response (ex. en-US, th-TH)",
    example : "",
    type : String,
    required: false
  })
  @IsString()
  locale: string;
  
  @ApiProperty({
    name: "name",
    description: "Product category name",
    example : "",
    type : String,
    required: false
  })
  @IsString()
  name: string;
  
  @ApiProperty({
    name: "desc",
    description: "Product category description",
    example : "",
    type : String,
    required: false
  })
  @IsString()
  desc: string;
  
  @ApiProperty({
    name: "status",
    description: "Product category status, status can be : <ul><li>Active</li><li>inactive</li></ul>",
    enum: ["Active", "inactive"],
    example : "Active",
    type : String,
    required: false
  })
  @IsString()
  status: string;
  
  @ApiProperty({
    name: "__v",
    description: "Data version",
    example : 0,
    type : Number,
  })
  @IsNumber()
  @IsDefined()
  @IsNotEmpty()
  __v: number
}
