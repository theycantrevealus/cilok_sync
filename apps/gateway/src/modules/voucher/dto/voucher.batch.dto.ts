export class VoucherBatchDto {
  locale: string;
  batch_no: string;
  batch_size: number;
  type: string;
  prefix: string;
  suffix: string;
  desc: string;
  product_name: string;
  merchant_name: string;
  start_time: Date;
  end_time: Date;
  realm_id: string;
  branch_id: string;
  merchant_id: string;
}
