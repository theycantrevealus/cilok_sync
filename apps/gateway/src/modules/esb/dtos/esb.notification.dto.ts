import { SetConfigDTOResponse } from "@/application/dto/set.config.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty } from "class-validator";
import { EsbNotificationResponse } from "./ebs.notification.response";
import { NotificationInboxDto } from "./notification.inbox.dto";
import { NotificationServiceDto } from "./notification.service.dto";
import { NotificationTransactionDto } from "./notification.transaction.dto";

export class EsbNotificationDTO {
  @ApiProperty({
    description: "Transaction",
    required: true
  })
  @IsNotEmpty()
  @Type(() => NotificationTransactionDto)
  transaction: NotificationTransactionDto;

  @ApiProperty({
    description: "Service",
    required: true
  })
  @IsNotEmpty()
  @Type(() => NotificationServiceDto)
  service: NotificationServiceDto;

  @ApiProperty({
    description: "Inbox",
    required: false
  })
  @Type(() => NotificationInboxDto)
  inbox: NotificationInboxDto;
}

export class EsbNotificationDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description : "Response from send Push Notification"
  })
  @Type(() => EsbNotificationResponse)
  payload: EsbNotificationResponse;
 }
