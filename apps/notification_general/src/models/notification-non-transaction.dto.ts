import { Type } from "class-transformer";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import { NotificationContentDto } from "./notification-content.dto";

export class NotificationNonTransactionDto {
  @IsString()
  @IsDefined()
  @IsNotEmpty()  
  origin: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  tracing_id: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  tracing_master_id: string;
  
  keyword?: string;

  @Type(() => NotificationContentDto)
  notification: NotificationContentDto[];
}

