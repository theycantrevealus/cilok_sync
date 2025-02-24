import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDefined, IsNotEmpty, IsObject, IsString } from "class-validator";
import { ProductPeriodRequestDto } from "./product-period.request";

export class ProductExpiryRequestDto {
  @ApiProperty({
    name: "type",
    description: "Expire Type",
    enum: ["Period", "Specific"]
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    name: "period",
    type: ProductPeriodRequestDto
  })
  @IsArray()
  @IsObject()
  @Type(() => ProductPeriodRequestDto)
  period: ProductPeriodRequestDto[];
}
