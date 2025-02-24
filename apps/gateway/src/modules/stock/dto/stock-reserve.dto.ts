import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDefined, IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class StockReserveDTO {
  @ApiProperty({
    description: "Id Location from smile loyalty DB",
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  origin_location: string;

  @ApiProperty({
    description: "Id Location from smile loyalty DB",
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  destination_location: string;

  @ApiProperty({
    description: "Id keyword from smile loyalty DB",
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  keyword: string;

  @ApiProperty({
    description: "Id Product from core",
    type: String,

  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  product: string;

  @ApiProperty({
    description: "QTY greater than 0",
    type: Number
  })
  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Min(1, {
    message: "QTY greater than 0"
  })
  qty: number;

  added_by?: string;
  
  @ApiProperty({
    description: "true reserver flashsale false no flash sale",
    type: Boolean
  })
  @IsDefined()
  @IsNotEmpty()
  @IsBoolean()
  is_flashsale: boolean;
}

export class StockReserveApproveByIdDTO {
  @ApiProperty({
    description: "Id Reserve Stock from smile loyalty DB",
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
