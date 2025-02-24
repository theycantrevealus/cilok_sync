import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Types } from "mongoose";

@Injectable()
export class TransactionHttpservice {
  private httpService: HttpService;
  private url!: string;

  constructor(
    configService: ConfigService,
    httpService: HttpService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
  }

  /**
   * Procedure for init auth & http service Transaction
   */
  initHttpService(): HttpService {
    this.httpService.axiosRef.defaults.baseURL = this.url;
    return this.httpService;
  }

  /**
   * Function for get headers transaction
   * @param token bearer token from header authorization request
   * @returns headers
   */
  getHeaders(token: string) {
   return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": token,
    }
  }

  getTracingId(request:any, response:any){
    const SLO_id = request.transaction_id ? request.transaction_id: new Types.ObjectId();
    let curr_date = new Date().toISOString().split('T')[0];
    const SLO_tracing_id = `SLO_${curr_date}_${SLO_id.toString()}`;
    let trace_id = response.trace_custom_code === 'UND' ? SLO_tracing_id : `${response.trace_custom_code}_${curr_date}_${SLO_id}`;
    return trace_id;
  }
}
