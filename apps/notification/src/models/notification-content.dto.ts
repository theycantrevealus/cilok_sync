import { EmailParamOptions } from "./email-param";

export class NotificationParamSms {
  msisdn: string
}

export class NotificationParamEmail extends EmailParamOptions {}

export class NotificationContentDto {
  via : string;
  template_content : string;
  param?: NotificationParamSms | NotificationParamEmail | any;
}

/**
 * This was create for send notification retry needs
 */
export class NotificationContentV2Dto {
  via: string;
  notification_code: string;
  template_content: string;
  param?: NotificationParamSms | NotificationParamEmail | any;
  is_retry?: boolean;
  retry_count?: number;
}
