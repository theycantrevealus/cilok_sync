import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";

export class InventoryPrimaryDto {
  realm_id?: string;
  branch_id?: string;
  
  @ApiProperty({
    name: "merchant_id",
    description: "Primary key unique value",
    example : "mercht-623bdcce7399b50e38fbe93a",
    type : String
  })
  @IsString()
  merchant_id: string;
}

export class InventoryPrimaryUpdateDto {
  @ApiProperty({
    name: "merchant_id",
    description: "Primary key unique value",
    example : "mercht-623bdcce7399b50e38fbe93a",
    type : String
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  merchant_id: string;
}
