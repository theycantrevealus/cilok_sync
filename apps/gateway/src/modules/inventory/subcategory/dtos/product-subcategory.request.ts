import { InventoryPrimaryUpdateDto } from "@/inventory/dtos/inventory-primary.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ProductSubategoryUpdateRequestDto extends InventoryPrimaryUpdateDto{
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
    name: "category_id",
    description: "ID category",
    example : "xxxxxx-5902ca0b0257bb14df426921",
    type : String,
    required: false
  })
  @IsString()
  category_id: string;
  
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
