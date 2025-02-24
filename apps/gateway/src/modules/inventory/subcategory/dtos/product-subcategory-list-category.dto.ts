import { ApiProperty } from "@nestjs/swagger";

export class ProductSubcategoryListCategoryDto {
  @ApiProperty({
    name: "id",
    description : "ID of Product Category",
    required: false
  })
  id: string;
  
  @ApiProperty({
    name: "name",
    description : "Name of product category",
    required: false
  })
  name: string;
  
  @ApiProperty({
    name: "status",
    description : "Status of Product category",
    required: false
  })
  status: string;
}
