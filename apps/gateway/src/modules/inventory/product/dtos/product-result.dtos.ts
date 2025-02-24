import { ProductCategoryProductResultDto, ProductCategoryResultDto } from "@/inventory/category/dtos/product-category-result.dto";
import { ProductSubcategoryProductResultDto } from "@/inventory/subcategory/dtos/product-subcategory-result.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ProductResultDto {
  @ApiProperty({
    name: "id",
    required: false,
    description: ""
  })
  id: string;
  
  @ApiProperty({
    name: "type",
    required: false,
    description: ""
  })
  type: string;
  
  @ApiProperty({
    name: "sub_type",
    required: false,
    description: ""
  })
  sub_type: string;
  
  @ApiProperty({
    name: "code",
    required: false,
    description: ""
  })
  code: string;
  
  @ApiProperty({
    name: "name",
    required: false,
    description: ""
  })
  name: string;
  
  @ApiProperty({
    name: "desc",
    required: false,
    description: ""
  })
  desc: string;
  
  @ApiProperty({
    name: "remark",
    required: false,
    description: ""
  })
  remark: string;
  
  @ApiProperty({
    name: "retail_price",
    required: false,
    description: ""
  })
  retail_price: number;
  
  @ApiProperty({
    name: "currency",
    required: false,
    description: ""
  })
  currency: string;
  
  @ApiProperty({
    name: "unit",
    required: false,
    description: ""
  })
  unit: string;
  
  @ApiProperty({
    name: "hashtags",
    required: false,
    description: "",
    type: String,
    isArray: true
  })
  hashtags?: string[];
  
  @ApiProperty({
    name: "image_url",
    required: false,
    description: ""
  })
  image_url?: string;
  
  @ApiProperty({
    name: "status",
    required: false,
    description: ""
  })
  status: string;
  
  @ApiProperty({
    name: "__v",
    required: false,
    description: "",
    type: Number
  })
  __v: number;
  
  @ApiProperty({
    name: "sub_category",
    required: false,
    description: "",
    type: ProductSubcategoryProductResultDto
  })
  sub_category: ProductSubcategoryProductResultDto;
  
  @ApiProperty({
    name: "category",
    required: false,
    description: "",
    type : ProductCategoryProductResultDto
  })
  @Type(() => ProductCategoryProductResultDto)
  category: ProductCategoryProductResultDto;
  
  @ApiProperty({
    name: "time",
    required: false,
    description: "",
    type: Date
  })
  time: Date;
}

export class ProductAddResult {
  @ApiProperty({
    name: "id",
    type: String,
    description: "ID of product"
  })
  id : string;
}
