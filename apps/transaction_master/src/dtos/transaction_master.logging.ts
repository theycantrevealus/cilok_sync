import { HttpStatus } from "@nestjs/common";

export class TransactionMasterLoggingRequest {
  payload:any;
  date_now?:any;
  is_success?:boolean;
  result?:any;
  step?: string;
  message?: string;
  statusCode?: HttpStatus;
  stack?:any;
}
