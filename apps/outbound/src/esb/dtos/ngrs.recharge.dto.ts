export class Transaction {
  transaction_id: string;
  channel: string;
}

export class Service {
  organization_code: string;
  service_id: string;
}

export class Recharge {
  amount: number;
  stock_type: string;
  element1: string;
}

export class MerchantProfile {
  third_party_id: string;
  third_party_password: string;
  delivery_channel: string;
  transmission_date: string;
  organization_short_code?: string;
}

export class NgrsRechargeDto {
  transaction: Transaction;
  service: Service;
  recharge: Recharge;
  merchant_profile: MerchantProfile;
}
