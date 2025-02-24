import { ApiProperty } from "@nestjs/swagger";

export class ProductCategoryResultDto {
  @ApiProperty({
    type: String,
    description: ""
  })
  id: string;

  @ApiProperty({
    type: String,
    description: ""
  })
  name: string;

  @ApiProperty({
    type: String,
    description: "",
    required: false
  })
  desc?: string;

  @ApiProperty({
    type: String,
    description: ""
  })
  status: string;

  @ApiProperty({
    type: Number,
    description: ""
  })
  __v: number;

  @ApiProperty({
    type: Date,
    description: ""
  })
  time: Date;
}

export class ProductCategoryProductResultDto {
  @ApiProperty({
    name: "id",
    description: "Id of product category",
    type: String,
    required: false
  })
  id: string;
  
  @ApiProperty({
    name: "name",
    description: "name of product category",
    type: String,
    required: false
  })
  name: string;
  
  @ApiProperty({
    name: "status",
    description: "Status of product category",
    type: String,
    required: false
  })
  status: string;
}

export class ProductCategoryAddRelust {
  @ApiProperty({
    type: String,
    description: "Id Product Category"
  })
  id: string;
}
