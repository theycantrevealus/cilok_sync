export class ReportingServiceResult {
  is_error?: boolean;
  message?: string;
  stack?: string;
  custom_code?: number;
  result?: any;

  constructor(data?: any) {
    this.is_error = data?.is_error;
    this.message = data?.message;
    this.stack = data?.stack;
    this.custom_code = data?.custom_code;
    this.result = data?.result;
  }
}
