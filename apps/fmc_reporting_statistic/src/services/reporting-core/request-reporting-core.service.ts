import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { plainToClass, plainToInstance } from 'class-transformer';
import { catchError, lastValueFrom, map } from 'rxjs';

import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';

import {
  RequestCoreDto,
  RequestCoreQuery,
} from '../../model/reporting-core/request-core.dto';

@Injectable()
export class RequestReportingCoreService {
  private core_url: string;
  private url: string;
  private urltoken: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private tselCoreUrl: string;

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    // CORE CONFIG /gateway
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.urltoken = configService.get<string>('core-backend.api.token-gateway');
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.core_url = `${configService.get<string>(
      'core-backend.raw_core_port',
    )}`;

    // CORE REPORTING CONFIG /tsel/gateway
    this.tselCoreUrl = `${configService.get<string>(
      'tsel-core-backend.raw_core_port',
    )}`;
  }

  async get(request: RequestCoreDto): Promise<GlobalTransactionResponse> {
    console.log('Get', request);
    const responseGlobal = new GlobalTransactionResponse();

    let queryString = null;
    // request.query.realm_id = this.realm;
    // request.query.branch_id = this.branch;
    request.query.merchant_id = this.merchant;

    const query = plainToInstance(RequestCoreQuery, request.query);
    queryString = query.buildQuery();

    const httpConfig = {
      headers: {
        Authorization: `${request.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (request.params) {
      httpConfig['params'] = request.params;
    }

    console.log(
      `${this.tselCoreUrl}/tsel/gateway/v3.0/stat/${request.path}${
        queryString ? '?' + queryString : ''
      }`,
      'log ke core reporting',
    );

    return await lastValueFrom(
      // TODO : Need Configurable 2259
      this.httpService
        .get(
          `${this.tselCoreUrl}/tsel/gateway/v3.0/stat/${request.path}${
            queryString ? '?' + queryString : ''
          }`,
          httpConfig,
        )
        .pipe(
          map(async (res) => {
            const resPayload = res.data.payload;
            if (res.data.code === 'S00000') {
              responseGlobal.code = res.data.code;
              responseGlobal.message = res.data.message;
              responseGlobal.transaction_classify = request.service;
              responseGlobal.payload = resPayload;
              return responseGlobal;
            } else {
              responseGlobal.code = res.data.code;
              responseGlobal.message = res.data.message;
              responseGlobal.transaction_classify = request.service;
              responseGlobal.payload = resPayload;
              return responseGlobal;
            }
          }),
          catchError(async (e) => {
            const response = new GlobalTransactionResponse();
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = request.service;
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }

  async postToken(request) {
    return await lastValueFrom(
      await this.httpService
        .post(`${this.urltoken}`, request, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          map(async (response) => {
            return response.data.payload;
          }),
          catchError(async (e: any) => {
            return null;
          }),
        ),
    );
  }
}
