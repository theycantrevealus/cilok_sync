import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';

import {
  RequestCoreGrossRevenue,
  RequestCorePointEarn,
  RequestCoreQuery,
  RequestCoreTotalEarner,
  RequestCoreTotalRedeemer,
  RequestCoreTotalRedeemerRevenue,
} from '../../model/reporting-core/request-core.dto';
import { RequestReportingCoreService } from './request-reporting-core.service';

@Injectable()
export class GeneralReportingCoreService {
  protected core_url: string;
  protected url: string;
  protected urltoken: string;
  protected realm: string;
  protected branch: string;
  protected merchant: string;
  private tselUsername: string;
  private tselPassword: string;
  private tselClientId: string;
  private tselClientSecret: string;
  private tselLocale: string;

  constructor(
    @Inject(HttpService) protected httpService: HttpService,
    @Inject(ConfigService) protected configService: ConfigService,
    @Inject(RequestReportingCoreService)
    private requestReportingCoreService: RequestReportingCoreService,
  ) {
    // super(httpService, configService);
    this.httpService = httpService;
    // CORE CONFIG /gateway : 1259
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.urltoken = configService.get<string>('core-backend.api.token-gateway');
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.core_url = `${configService.get<string>(
      'core-backend.raw_core_port',
    )}`;

    // CORE REPORTING CONFIG /tsel/gateway :2259
    this.tselClientId = `${configService.get<string>(
      'tsel-core-backend.client.id',
    )}`;
    this.tselClientSecret = `${configService.get<string>(
      'tsel-core-backend.client.secret',
    )}`;
    this.tselUsername = `${configService.get<string>(
      'tsel-core-backend.client.username',
    )}`;
    this.tselPassword = `${configService.get<string>(
      'tsel-core-backend.client.password',
    )}`;
    this.tselLocale = `${configService.get<string>(
      'tsel-core-backend.client.locale',
    )}`;
  }

  async getToken() {
    // TODO : Need Configurable
    const payload = {
      locale: this.tselLocale,
      type: 'user',
      username: this.tselUsername,
      password: this.tselPassword,
      client_id: this.tselClientId,
      client_secret: this.tselClientSecret,
    };

    return await this.requestReportingCoreService.postToken(payload);
  }

  async getTotalRedeemer(
    payload: RequestCoreTotalRedeemer,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    if (payload.channel) {
      query.channel = payload.channel;
    }
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-redeemer',
      query: query,
      token: payload.token,
      service: 'TOTAL_REDEMEER',
    });
  }

  async getTotalRedeemer2(
    payload: RequestCoreTotalRedeemer,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    if (payload.channel) {
      query.channel = payload.channel;
    }
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-redeemer-earn',
      query: query,
      token: payload.token,
      service: 'TOTAL_REDEMEER',
    });
  }

  async getTotalRedeemerRevenue(
    payload: RequestCoreTotalRedeemerRevenue,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    if (payload.channel) {
      query.channel = payload.channel;
    }
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-redeemer-revenue',
      query: query,
      token: payload.token,
      service: 'TOTAL_REDEMEER_REVENUE',
    });
  }

  async getTotalEarner(
    payload: RequestCoreTotalEarner,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-earner',
      query: query,
      token: payload.token,
      service: 'TOTAL_EARNER',
    });
  }

  async getPointEarn(
    payload: RequestCorePointEarn,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-earn',
      query: query,
      token: payload.token,
      service: 'POINT_EARN',
    });
  }

  async getGrossRevenue(
    payload: RequestCoreGrossRevenue,
  ): Promise<GlobalTransactionResponse> {
    const query = new RequestCoreQuery();
    query.date = payload.date;

    return await this.requestReportingCoreService.get({
      path: 'total-revenue',
      query: query,
      token: payload.token,
      service: 'GROSS_REVENUE',
    });
  }
}
