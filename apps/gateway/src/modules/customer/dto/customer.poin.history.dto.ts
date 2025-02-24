export class CustomerPoinHistoryDto {
  transaction_id: string;
  transaction_no: string;
  type: string;
  action: string;
  channel: string;
  status: string;
  core_id: string;
  customer_id: string;
  time: Date;
  total: number;

  constructor(data: any) {
    this.transaction_id = data.transaction_id;
    this.transaction_no = data.transaction_no;
    this.type = data.type;
    this.action = data.action;
    this.channel = data.channel;
    this.status = data.status;
    this.core_id = data.core_id;
    this.customer_id = data.customer_id;
    this.time = data.time;
    this.total = data.total;
  }
}
