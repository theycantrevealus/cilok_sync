import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ProductSubcategoryListCategoryDto } from "./product-subcategory-list-category.dto";

export class ProductSubcategoryListDto {
  @ApiProperty({
    name: "id",
    description: "Id of product subcategory",
    type: String,
    required: false
  })
  id: string;
  
  @ApiProperty({
    name: "name",
    description: "name of product subcategory",
    type: String,
    required: false
  })
  name: string;
  
  @ApiProperty({
    name: "desc",
    description: "Description of product subcategory",
    type: String,
    required: false
  })
  desc?: any;
  
  @ApiProperty({
    name: "status",
    description: "Status of product subcategory",
    type: String,
    required: false
  })
  status: string;
  
  @ApiProperty({
    name: "agent",
    description: "Agent of the resource request.",
    type: String,
    required: false
  })
  agent: string;
  
  @ApiProperty({
    name: "__v",
    description: "Data Version",
    type: Number,
    required: false
  })
  __v: number;

  
  @ApiProperty({
    name: "category",
    description: "Category of product, or parent from subcategory",
    type: ProductSubcategoryListCategoryDto,
    required: false
  })
  @Type(() => ProductSubcategoryListCategoryDto)
  category: ProductSubcategoryListCategoryDto[];
  
  @ApiProperty({
    name: "time",
    description: "Time is created at product subcategory.",
    type: Date,
    required: false
  })
  time: Date;
}
