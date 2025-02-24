import {HttpService} from "@nestjs/axios"
import {Injectable} from "@nestjs/common"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class LinkAjaConfig {
  private url!: string
  private username!: string
  private secret!: string

  constructor(
    private httpService: HttpService,
    configService: ConfigService
  ) {
    this.username = `${configService.get<string>('link-aja-backend.client.username')}`
    this.secret = `${configService.get<string>('link-aja-backend.client.secret')}`
    this.url = `${configService.get<string>('link-aja-backend.api.url')}`
  }

  /**
   * Procedure for init auth & http service link-aja
   */
  initHttpService(): void {
    this.httpService.axiosRef.defaults.baseURL = this.url
  }

  getHttpService(): HttpService {
    return this.httpService
  }

  /**
   * function for get header with algorithm hmac-sha256
   * @param method
   * @param endpoint
   * @param payload
   */
  getHeader(method, endpoint, payload?: any) {
    let path = "/v1" + endpoint
    let datetime = (new Date()).toUTCString()
    let CryptoJS = require("crypto-js")
    let algorithm = "hmac-sha256"
    let digestBody = CryptoJS.SHA256(payload);
    let digestBodyHeader = "SHA-256=" + digestBody.toString(CryptoJS.enc.Base64)
    let signingString = "date: " + datetime + "\n" + method + " " + path + " HTTP/1.1" + "\n" + "digest: " + digestBodyHeader
    let signature = CryptoJS.HmacSHA256(signingString, this.secret).toString(CryptoJS.enc.Base64)
    let authorization = `hmac username="${this.username}", algorithm="${algorithm}", headers="date request-line digest", signature="${signature}"`

    return {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'Date': datetime,
      'Digest': digestBodyHeader,
    }
  }
}
