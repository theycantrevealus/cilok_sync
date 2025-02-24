import { ApiProperty } from "@nestjs/swagger";

export class ProductSubcategoryAddResult {
  @ApiProperty({
    name: "id",
    type: String,
    description: "ID of product subcategory"
  })
  id : string;
}

export class ProductSubcategoryProductResultDto {
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
    name: "status",
    description: "Status of product subcategory",
    type: String,
    required: false
  })
  status: string;
}
