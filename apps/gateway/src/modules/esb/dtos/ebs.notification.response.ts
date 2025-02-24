import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { EsbBaseResponseBadRequest } from "./ebs.base.response";
import { EsbMessageDtoReponse } from "./esb.message.dto.response";
import { EsbTransactionResponse } from "./esb.transaction.response";

export class EsbNotificationResponse {
  @ApiProperty({
    description : "Transaction"
  })
  @Type(() => EsbTransactionResponse)
  transaction: EsbTransactionResponse

  @ApiProperty({
    required: false,
    description : "Message"
  })
  @Type(() => EsbMessageDtoReponse)
  message: EsbMessageDtoReponse;
}

export class EsbNotificationResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description : "BAD REQUEST Push Notification ESB"
  })
  code: string;

  constructor() {
    super();
    this.code = 'E02000';
  }
}
