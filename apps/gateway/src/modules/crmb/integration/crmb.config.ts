import {HttpService} from "@nestjs/axios"
import {Injectable} from "@nestjs/common"
import {ConfigService} from "@nestjs/config"
import * as fs from 'fs';
import * as https from 'https';
import {generateMd5} from "@/application/utils/Hash/md5";

@Injectable()
export class CrmbConfig {
  private readonly url!: string
  private readonly ca_file: string
  private readonly secret: string
  protected timeout_api: string
  protected is_http: string
  private readonly auth_token: string
  private readonly apiKey: string

  constructor(
    private httpService: HttpService,
    configService: ConfigService
  ) {
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.timeout_api = `${configService.get<string>('crmb.api.timeout')}`
    this.ca_file = `${configService.get<string>('crmb.api.ca')}`;
    this.secret = `${configService.get<string>('crmb.client.secret')}`
    this.is_http = `${configService.get<string>('crmb.client.is_http')}`
    this.auth_token = `${configService.get<string>('crmb.api.auth_token')}`
    this.apiKey = `${configService.get<string>('crmb.client.api_key')}`
  }

  /**
   * Procedure for init auth & http service link-aja
   */
  initHttpService(): void {
    this.httpService.axiosRef.defaults.baseURL = this.url
  }

  /**
   * function for get http service
   */
  getHttpService(): HttpService {
    this.httpService.axiosRef.defaults.baseURL = this.url
    return this.httpService
  }

  /**
   * function for get url
   */
  getUrl() {
    return this.url;
  }

  /**
   * function for get url
   */
  getApikey(): string {
    return this.apiKey;
  }


  /**
   * function for generate signature
   * @returns string
   */
  generateSignature(): string {
    const unix = this.generateUnixTimestamp();
    return generateMd5(`${this.apiKey}${this.secret}${unix}`);
  }

  /**
   * function for generate UNIX Timestamp, timestamp in seconds (Unix timestamp)
   * @returns number
   */
  generateUnixTimestamp(): number {
    const date = new Date();
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * function for get header
   */
  getHeader() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api_key': this.getApikey(),
      'x-signature': this.generateSignature(),
      'Authorization': `Basic ${this.auth_token}`,
    };
  }


  getRequestOption() {
    const caFilePath = this.ca_file;
    const caFile = fs.readFileSync(caFilePath);

    return {
      httpsAgent: new https.Agent({ca: caFile, rejectUnauthorized: false}),
      headers: this.getHeader(),
      timeout: Number(this.timeout_api),
    };
  }

}
