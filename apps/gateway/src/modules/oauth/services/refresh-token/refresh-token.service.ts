import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { catchError, lastValueFrom, map, Observable } from 'rxjs';

import { LogOauthRefreshTokenService } from '@/logging/services/oauth/oauth.service';

import { AccountRefreshDTO } from '../../dto/refresh.dto';
@Injectable()
export class RefreshTokenService {
  private httpService: HttpService;
  private url: string;
  private raw_core: string;
  private logService: LogOauthRefreshTokenService;
  private http;
  private raw_port: number;
  constructor(
    configService: ConfigService,
    httpService: HttpService,
    logService: LogOauthRefreshTokenService,
  ) {
    // this.url =
    //   configService.get<string>('core-backend-api.url') +
    //   '/oauth/refresh-token';
    this.url = configService.get<string>('core-backend.api.refresh-token');
    this.httpService = httpService;
    this.logService = logService;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.http =
      configService.get<string>('core-backend.api.mode') === 'https'
        ? require('https')
        : require('http');
  }

  async getRefreshTokenData(
    request: AccountRefreshDTO,
    param: any,
  ): Promise<Observable<AxiosResponse<any, any>>> {
    return await lastValueFrom(
      this.httpService
        .post(
          `${this.url}`,
          {
            locale: request.locale ? request.locale : 'id-ID',
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
            await this.logService.logResponse(`${this.url}`, response);

            const rsp = {
              code: response.data.code,
              message: response.data.message,
              ...response.data.payload,
            };

            return rsp;
          }),
          catchError(async (err: any) => {
            this.logService.logResponse(`${this.url}`, err.response);

            console.log('err_refresh_token : ', err?.response?.data);

            if (err?.response?.data?.code == 'E01001') {
              throw new BadRequestException([
                { isTokenNotFoundOrExpired: err.response.data.message },
              ]);
            } else {
              console.log(err);
              // throw new BadRequestException(err);
            }

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

        const req = this.http.request(options, function (res) {
          const chunks = [];

          console.log(res);

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
