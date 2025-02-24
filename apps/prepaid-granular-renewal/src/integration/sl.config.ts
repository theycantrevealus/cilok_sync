import { HttpService } from "@nestjs/axios"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class SlConfig {
  private url!: string

  constructor(
    private httpService: HttpService,
    configService: ConfigService
  ) {
    this.url = `${configService.get<string>('slIP')}`
  }

  /**
   * Procedure for init auth & http service SL
   */
  initHttpService(): void {
    this.httpService.axiosRef.defaults.baseURL = this.url
  }

  getHttpService(): HttpService {
    console.log('url', this.url)
    return this.httpService
  }

  /**
   * get header
   */
  getHeader() {
    return {
      'Content-Type': 'application/json',
    }
  }
}
