export class ResponseDeduct {
  status?: boolean;
  message?: string;
  data?: any;
  statusCode?: string;
  constructor(data: any) {
    this.status = data?.status ?? false;
    this.message = data?.message ?? '';
    this.data = data?.data ?? null;
    this.statusCode = data?.statusCode;
  }
}
