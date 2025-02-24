import { ApiProperty } from "@nestjs/swagger";

export class EsbInboxIdResponse {
  @ApiProperty({
    description: "Inbox Identifier."
  })
  id: string; 
}
