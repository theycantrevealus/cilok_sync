import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';

import { LogOauthRefreshTokenService } from '@/logging/services/oauth/oauth.service';

import { AccountRefreshDTO } from '../../dto/refresh.dto';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');
@Injectable()
export class RefreshTokenService {
  private httpService: HttpService;
  private url: string;
  private raw_core: string;
  private logService: LogOauthRefreshTokenService;
  constructor(
    configService: ConfigService,
    httpService: HttpService,
    logService: LogOauthRefreshTokenService,
  ) {
    this.url =
      configService.get<string>('core-backend-api.url') +
      '/oauth/refresh-token';
    this.httpService = httpService;
    this.logService = logService;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
  }

  async getRefreshTokenData(
    request: AccountRefreshDTO,
    param: any,
  ): Promise<Observable<AxiosResponse<any, any>>> {
    return await lastValueFrom(
      this.httpService
        .post(
          `${process.env.CORE_BACKEND_API_URL}/oauth/refresh-token`,
          {
            locale: 'id-ID',
            refresh_token: request.refresh_token,
            client_id: process.env.CORE_BACKEND_CLIENT_ID,
            client_secret: process.env.CORE_BACKEND_CLIENT_SECRET,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: param.auth,
            },
          },
        )
        .pipe(
          map(async (response) => {
            await this.logService.logResponse(
              `${process.env.CORE_BACKEND_API_URL}/oauth/refresh-token`,
              response,
            );

            return response.data;
          }),
          catchError(async (err: any) => {
            this.logService.logResponse(
              `${process.env.CORE_BACKEND_API_URL}/oauth/refresh-token`,
              err.response,
            );
            //return throwError(
            //   () => new HttpException(err.response.data, err.response.status),
            // );
          }),
        ),
    );
  }

  async refresh_token(param: any) {
    const _this: any = this;
    return new Promise((resolve, reject) => {
      if (param && param.auth) {
        const options = {
          method: 'POST',
          hostname: this.raw_core,
          port: null,
          path: '/gateway/v3.0/oauth/refresh-token',
          headers: {
            Authorization: `${param.auth}`,
            'Content-Type': 'application/json',
          },
        };

        const req = http.request(options, function (res) {
          const chunks = [];

          res.on('data', function (chunk) {
            chunks.push(chunk);
          });

          res.on('end', async () => {
            if (chunks) {
              const body = Buffer.concat(chunks);
              const response = JSON.parse(body.toString());
              resolve(response);
            }
          });

          res.on('error', function (chunk) {
            reject(chunk);
          });
        });

        req.write(
          JSON.stringify({
            locale: param.request.locale,
            refresh_token: param.request.refresh_token,
            client_id: param.request.client_id,
            client_secret: param.request.client_secret,
          }),
        );

        req.end();
      } else {
        reject('No Header');
      }
    });
  }

  getUrl(): string {
    return this.url;
  }
}
