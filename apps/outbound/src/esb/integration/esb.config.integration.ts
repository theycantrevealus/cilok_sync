import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as https from 'https';

import { generateMd5 } from '../../utils/Hash/md5';

@Injectable()
export class EsbConfigIntegration {
  private httpService: HttpService;
  private url!: string;
  private apiKey!: string;
  private secret!: string;
  private caFile!: string;
  private timeout!: string;

  constructor(httpService: HttpService, configService: ConfigService) {
    this.httpService = httpService;
    this.apiKey = `${configService.get<string>('esb-backend.client.api_key')}`;
    this.secret = `${configService.get<string>('esb-backend.client.secret')}`;
    this.url = `${configService.get<string>('esb-backend.api.url')}`;
    this.caFile = `${configService.get<string>('esb-backend.api.ca')}`;
    this.timeout = `${configService.get<string>('esb-backend.api.timeout')}`;
  }

  /**
   * Procedure for init auth & http service EBS
   */
  // initHttpService(): void {
  //   this.httpService.axiosRef.defaults.baseURL = this.url;
  // }

  getHttpService(): HttpService {
    return this.httpService;
  }

  getUrl() {
    return this.url;
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
    const timestampInSeconds = Math.floor(date.getTime() / 1000);
    return timestampInSeconds;
  }

  getApikey(): string {
    return this.apiKey;
  }

  getHeader() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api_key': this.getApikey(),
      'x-signature': this.generateSignature(),
    };
  }

  getRequestOption() {
    const caFilePath = this.caFile;
    const caFile = fs.readFileSync(caFilePath);

    const requestOptions = {
      httpsAgent: new https.Agent({ ca: caFile, rejectUnauthorized: false }),
      headers: this.getHeader(),
      timeout: Number(this.timeout),
    };
    return requestOptions;
  }
}
