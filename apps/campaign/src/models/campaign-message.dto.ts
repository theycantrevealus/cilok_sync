import { Type } from 'class-transformer';

export class Via {
  id: string;
  value: string;
}

export class NotificationConfig {
  content: string;

  @Type(() => Via)
  via: Via[];
}

export class CampaignMessageDto {
  campaign_id: string;
  campaign_recipient_id: string;
  campaign_broadcast_batch: string;
  msisdn: string;

  @Type(() => NotificationConfig)
  notification_config: NotificationConfig;
}
