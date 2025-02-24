import { InventoryPrimaryDto, InventoryPrimaryUpdateDto } from "@/inventory/dtos/inventory-primary.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ProductSubcategoryListDto } from "./product-subcategory-list.dto";

export class ProductSubcategoryDto {
  @ApiProperty({
    description: "Data product category",
    isArray: true,
    type: ProductSubcategoryListDto
  })
  @Type(() => ProductSubcategoryListDto)
  product_sub_categories: ProductSubcategoryListDto[];
}

export class ProductSubcategorySingleDto {
  @ApiProperty({
    description: "Data product category",
    type: ProductSubcategoryListDto
  })
  @Type(() => ProductSubcategoryListDto)
  product_sub_categories: ProductSubcategoryListDto;
}

export class ProductSubcategoryRequestDto extends InventoryPrimaryDto {
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

  @ApiProperty({
    name: "category_id",
    description: "Primary key unique value",
    example : "prdcat-623bdcce7399b50e38fbe93a",
    type : String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  category_id: string;
}

export class ProductSubcategoryUpdateRequestDto extends InventoryPrimaryUpdateDto{
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
