import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class InventoryHttpservice {
  private httpService: HttpService;
  private url!: string;
  private realm: string;
  private branch: string;

  constructor(
    configService: ConfigService,
    httpService: HttpService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
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

  getRealm(): string {
    return this.realm;
  }

  getBranch(): string {
    return this.branch;
  }
}
