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
