import { GlobalErrorResponse, GlobalResponse } from "@/dtos/response.dto";
import { ApiProperty } from "@nestjs/swagger";

export class StockResponse extends GlobalResponse {
  @ApiProperty({
    description: "transaction code",
    example: "S00000"
  })
  code : string;
}

export class StockErroResponse extends GlobalErrorResponse {
  @ApiProperty({
    description: "transaction code",
    example: "S00000"
  })
  code : string;
}
