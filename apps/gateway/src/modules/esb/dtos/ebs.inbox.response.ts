import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { EsbBaseResponseBadRequest } from "./ebs.base.response";
import { EsbInboxIdResponse } from "./esb.inbox.id.response";
import { EsbTransactionResponse } from "./esb.transaction.response";

export class EsbInboxResponse {
  @ApiProperty({
    description : "transaction"
  })
  @Type(() => EsbTransactionResponse)
  transaction: EsbTransactionResponse

  @ApiProperty({
    required: false,
    description : "Inbox"
  })
  @Type(() => EsbInboxIdResponse)
  inbox: EsbInboxIdResponse;
}

export class EsbInboxResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description : "BAD REQUEST INBOX ESB"
  })
  code: string;

  constructor() {
    super()
    this.code = 'E02000';
  }
}
