import {
  AxiosFulfilledInterceptor,
  AxiosInterceptor,
} from '@narando/nest-axios-interceptor';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpInterceptor extends AxiosInterceptor {
  constructor(httpService: HttpService, private configService: ConfigService) {
    super(httpService);
  }

  requestFulfilled(): AxiosFulfilledInterceptor<AxiosRequestConfig> {
    return (config) => {
      const clientProxyHost =
        this.configService.get<string>('CLIENT_PROXY_HOST');

      if (clientProxyHost) {
        config.proxy = {
          host: clientProxyHost,
          port: parseInt(
            this.configService.get<string>('CLIENT_PROXY_PORT'),
            10,
          ),
        };

        const clientProxyUsername = this.configService.get<string>(
          'CLIENT_PROXY_USERNAME',
        );
        if (clientProxyUsername) {
          config.proxy.auth = {
            username: clientProxyUsername,
            password: this.configService.get<string>('CLIENT_PROXY_PASSWORD'),
          };
        }
      }

      config.headers = {
        ...config.headers,
        client_id: this.configService.get<string>('TELEGRAM_API_CLIENT_ID'),
        client_secret: this.configService.get<string>(
          'TELEGRAM_API_CLIENT_SECRET',
        ),
      };
      return config;
    };
  }
}
