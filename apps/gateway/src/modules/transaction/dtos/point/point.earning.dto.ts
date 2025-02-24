export class EarningPayloadDTO {
  locale: string;
  event_code: string;
  transaction_no: string;
  channel: string;
  revenue: number;
  point: number;
  sp_multiplier: number;
  msisdn: string;
  package_name: string;
  order_id: string;
  business_id: string;
  default_earning: boolean;
}
