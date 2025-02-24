import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { generateMd5 } from '../../application/utils/Hash/md5';

export class MyTselConfigIntegration {
  private httpService: HttpService;
  private url!: string;
  private apiKey!: string;
  private secret!: string;
  private unix!: number;

  constructor(httpService: HttpService, configService: ConfigService) {
    this.httpService = httpService;
    this.unix = this.generateUnixTimestamp();
    this.apiKey = `${configService.get<string>(
      'mytsel-backend.client.api_key',
    )}`;
    this.secret = `${configService.get<string>(
      'mytsel-backend.client.secret',
    )}`;
    this.url = `${configService.get<string>('mytsel-backend.api.url')}`;
  }

  /**
   * Procedure for init auth & http service EBS
   */
  initHttpService(): void {
    this.httpService.axiosRef.defaults.baseURL = this.url;
  }

  getHttpService(): HttpService {
    return this.httpService;
  }

  /**
   * function for generate signature
   * @returns string
   */
  generateSignature(): string {
    return generateMd5(`${this.apiKey}${this.secret}${this.unix}`);
  }

  /**
   * function for generate UNIX Timestamp, timestamp in seconds (Unix timestamp)
   * @returns number
   */
  generateUnixTimestamp(): number {
    const date = new Date();
    const timestampInSeconds = Math.floor(date.getTime() / 1000);
    return timestampInSeconds;
  }

  getApikey(): string {
    return this.apiKey;
  }

  getHeader() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      api_key: this.getApikey(),
      'x-signature': this.generateSignature(),
    };
  }
}
