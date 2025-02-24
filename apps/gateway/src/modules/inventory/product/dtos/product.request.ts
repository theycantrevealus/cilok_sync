import { InventoryPrimaryDto } from "@/inventory/dtos/inventory-primary.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDefined, IsNotEmpty, IsNumber, IsObject, IsString } from "class-validator";
import { ProductAttributeRequestDto } from "./product-attribute.request";
import { ProductDiscountRequestDto } from "./product-discount.request";
import { ProductExpiryRequestDto } from "./product-expiry.request";

export class ProductRequestDto extends InventoryPrimaryDto {
  @ApiProperty({
    name: "locale",
    description: "pattern: [a-z]{2}-[A-Z]{2}",
    example: "id-ID",
    required: false,
    type: String
  })
  @IsString()
  locale: string;

  @ApiProperty({
    name: "type",
    description: "Product type",
    example: "Product",
    required: false,
    type: String
  })
  @IsString()
  type: string;

  @ApiProperty({
    name: "sub_type",
    description: "Product sub type",
    example: "Non-Stock",
    required: false,
    type: String
  })
  @IsString()
  sub_type: string;

  @ApiProperty({
    name: "code",
    description: "Product code",
    example: "LDK001",
    required: true,
    type: String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    name: "name",
    description: "Product Name",
    example: "Ear Pod",
    required: true,
    type: String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    name: "desc",
    description: "Description of Prorduct.",
    example: "Deskripsi",
    required: false,
    type: String
  })
  @IsString()
  desc: string;

  @ApiProperty({
    name: "remark",
    description: "",
    example: "Remark ja...",
    required: false,
    type: String
  })
  @IsString()
  remark: string;

  @ApiProperty({
    name: "retail_price",
    description: "Product sell price",
    example: 1000,
    type: Number,
    required: true
  })
  @IsNumber()
  @IsDefined()
  @IsNotEmpty()
  retail_price: number;

  @ApiProperty({
    name: "bonus",
    description: "Product bonus (For 'B-Wallet' and 'Package')",
    required: false,
    example: 0,
    type: Number
  })
  @IsNumber()
  bonus: number;

  @ApiProperty({
    name: "qty",
    description: "Product qty.",
    required: false,
    example: 0,
    type: Number
  })
  @IsNumber()
  qty: number;

  @ApiProperty({
    name: "currency",
    description: "Currency price",
    required: false,
    type: String,
    example: "IDR"
  })
  @IsString()
  currency: string;

  @ApiProperty({
    name: "unit",
    description: "Product unit",
    required: false,
    type: String,
    example: "Pcs"
  })
  @IsString()
  unit: string;

  @ApiProperty({
    name: "skip_stock",
    description: "Flag define need to cut stock",
    required: false,
    example: false,
    type: Boolean
  })
  skip_stock: boolean;

  @ApiProperty({
    name: "hastags",
    description: "pattern: ^(#[a-zA-Z0-9ก-๛])(?!;)]",
    required: false
  })
  @IsArray()
  hashtags: string[];

  @ApiProperty({
    name: "status",
    description: "Status can be",
    enum: ["Active", "Inactive"],
    required: false,
    type: String
  })
  @IsString()
  status: string;

  @ApiProperty({
    name: "action",
    description: "Action for the file;",
    enum: ["upload_image", "remove_image"],
    required: false,
    type: String
  })
  @IsString()
  action: string;

  @ApiProperty({
    name: "sub_category_id",
    description: "Primary key unique value of subcategory",
    required: false,
    type: String,
    example: "xxxxxx-5902ca0b0257bb14df426921"
  })
  @IsString()
  sub_category_id: string;

  @ApiProperty({
    name: "category_id",
    description: "Primary key unique value of category",
    required: false,
    type: String,
    example: "xxxxxx-5902ca0b0257bb14df426921"
  })
  @IsString()
  category_id: string;

  @ApiProperty({
    name: "",
    description: "",
    required: false
  })
  image: string;

  @ApiProperty({
    name: "expiry",
    type: ProductExpiryRequestDto,
    required: false
  })
  @IsObject()
  @Type(() => ProductExpiryRequestDto)
  expiry: ProductExpiryRequestDto;

  @ApiProperty({
    name: "discount",
    type: ProductDiscountRequestDto,
    required: false
  })
  @IsObject()
  @Type(() => ProductDiscountRequestDto)
  discount: ProductDiscountRequestDto;

  @ApiProperty({
    name: "attributes",
    type: ProductAttributeRequestDto,
    isArray: true,
    required: false
  })
  @IsArray()
  @Type(() => ProductAttributeRequestDto)
  attributes: ProductAttributeRequestDto[];
}


export class ProductUpdateRequestDto extends ProductRequestDto {
  @ApiProperty({
    name: "__v",
    description: "Version data on core",
    required: true,
    type: Number
  })
  @IsNumber()
  @IsDefined()
  @IsNotEmpty()
  __v: number;

  core_version?: number;
}
