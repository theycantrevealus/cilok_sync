import {HttpService} from "@nestjs/axios";
import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import * as fs from "fs";
import {join} from "path";

@Injectable()
export class ConfigIntegration {
  private httpService: HttpService;
  private url: string;
  private apiKey: string;
  private secret: string;
  private raw_port: number;

  constructor(
    httpService: HttpService,
    configService: ConfigService
  ) {
    this.httpService = httpService;
    this.apiKey =  `${configService.get<string>('e2ebi-backend.client.api_key')}`;
    this.secret =  `${configService.get<string>('e2ebi-backend.client.secret')}`;
    this.url = `${configService.get<string>('e2ebi-backend.api.url')}`;
    this.raw_port = Number(`${configService.get<number>('e2ebi-backend.raw_port')}`);
  }

  initHttpService(): void {
    this.httpService.axiosRef.defaults.baseURL = `${this.url}:${this.raw_port}`;
  }

  getHttpService(): HttpService {
    return this.httpService;
  }

  getApikey(): string {
    return this.apiKey
  }


  getHeader() {
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "api-key": this.getApikey(),
      'secret-key': this.secret,
    }
  }
}
