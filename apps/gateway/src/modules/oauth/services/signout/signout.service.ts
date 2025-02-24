import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccountLogoutDTO } from '@/oauth/dto/logout.dto';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');
@Injectable()
export class SignOutService {
  private httpService: HttpService;
  private url: string;
  private raw_core: string;

  constructor(configService: ConfigService, httpService: HttpService) {
    this.url =
      configService.get<string>('core-backend-api.url') + '/oauth/signout';
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.httpService = httpService;
  }

  getSignOutData(request: AccountLogoutDTO, token: string): Promise<any> {
    // return this.httpService.post(this.url, request);
    const _this: any = this;
    return new Promise((resolve, reject) => {
      if (token) {
        const options = {
          method: 'POST',
          hostname: this.raw_core,
          port: null,
          path: '/gateway/v3.0/oauth/refresh-token',
          headers: {
            Authorization: `${token}`,
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

        req.write(JSON.stringify(request));

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
