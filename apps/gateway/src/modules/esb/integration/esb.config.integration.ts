import { generateMd5 } from '@gateway/application/utils/Hash/md5';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as https from 'https';

@Injectable()
export class EsbConfigIntegration {
  private httpService: HttpService;
  private url!: string;
  private url_dsp!: string;
  private apiKey!: string;
  private secret!: string;
  private unix!: number;
  private timeout!: string;
  private caFile!: string;

  constructor(httpService: HttpService, configService: ConfigService) {
    this.httpService = httpService;
    this.apiKey = `${configService.get<string>('esb-backend.client.api_key')}`;
    this.secret = `${configService.get<string>('esb-backend.client.secret')}`;
    this.url = `${configService.get<string>('esb-backend.api.url')}`;
    this.url_dsp = `${configService.get<string>('esb-backend.api.url_dsp')}`;
    this.caFile = `${configService.get<string>('esb-backend.api.ca')}`;
    this.timeout = `${configService.get<string>('esb-backend.api.timeout')}`;
  }

  /**
   * Procedure for init auth & http service EBS
   */
  initHttpService(custom = ''): void {
    this.httpService.axiosRef.defaults.baseURL =
      custom !== '' ? custom : this.url;
  }

  getHttpService(): HttpService {
    return this.httpService;
  }

  getUrl() {
    return this.url;
  }

  getUrlDSP() {
    return this.url_dsp;
  }

  /**
   * function for generate signature
   * @returns string
   */
  generateSignature(): string {
    this.unix = this.generateUnixTimestamp();
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
