import { SetConfigDTOResponse } from "@/application/dto/set.config.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty } from "class-validator";
import { EsbInboxResponse } from "./ebs.inbox.response";
import { InboxDto } from "./inbox.dto";
import { InboxServiceDto } from "./inbox.service.dto";
import { InboxTransactionDto } from "./inbox.transaction.dto";

export class EsbInboxDto {
  @ApiProperty({
    description: 'transaction',
  })
  @IsNotEmpty()
  @Type(() => InboxTransactionDto)
  transaction: InboxTransactionDto;

  @ApiProperty({
    required: false,
    description: 'service',
  })
  @Type(() => InboxServiceDto)
  service: InboxServiceDto;

  @ApiProperty({
    required: false,
    description: 'inbox',
  })
  @Type(() => InboxDto)
  inbox: InboxDto;
}

export class EsbInboxDtoResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description : "Response from insert Inbox"
  })
  @Type(() => EsbInboxResponse)
  payload: EsbInboxResponse;
 }


