import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

@Injectable()
export class UtilsService {
  private token_gateway: string;
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.token_gateway = `${configService.get<string>(
      'core-backend.api.token-gateway',
    )}`;
    this.httpService = httpService;
  }

  async getToken(): Promise<any> {
    console.log('url gateway', this.token_gateway);
    const payload = {
      locale: 'id-ID',
      type: 'user',
      username: this.configService.get<string>('core-backend.client.username'),
      password: this.configService.get<string>('core-backend.client.password'),
      client_id: this.configService.get<string>('core-backend.client.id'),
      client_secret: this.configService.get<string>(
        'core-backend.client.secret',
      ),
    };

    return await lastValueFrom(
      await this.httpService
        .post(this.token_gateway, payload, {
          headers: {
            'Content-Type': 'application/json',
            // Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data.payload;
            return {
              status: res.status,
              message: data.message,
              payload: data,
            };
          }),
          catchError(async (err: any) => {
            console.log(err);
            if (err.code !== 'ENOTFOUND') {
              // throwError(() => new HttpException(err.response.data, 404));
              console.log({
                status: 404,
                message: err.data?.message,
                payload: err.data,
              });
              return {
                status: 404,
                message: err.data?.message,
                payload: err.data,
              };
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }

  async getAPI(payload: any): Promise<any> {
    const params = payload.params;
    const url = payload.url;
    const token = payload.token;
    return await lastValueFrom(
      await this.httpService
        .get(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          params: params,
        })
        .pipe(
          map(async (res) => {
            console.log('success', res);
            const data = res.data.payload;
            return {
              status: res.status,
              message: data.message,
              payload: data,
            };
          }),
          catchError(async (err: any) => {
            console.log('error', err);
            if (err.code !== 'ENOTFOUND') {
              const status = err.response.status;
              throwError(() => new HttpException(err.response.data, status));
              return {
                status: status,
                message: err.data?.message,
                payload: err.data,
              };
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }

  async postAPI(payload: any): Promise<any> {
    const requestBody = payload.requestBody;
    const params = payload.params;
    const url = payload.url;
    const token = payload.token;
    console.log(url);
    return await lastValueFrom(
      await this.httpService
        .post(url, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          params: params,
        })
        .pipe(
          map(async (res) => {
            console.log('200', res);
            const data = res.data.payload;
            return {
              status: res.status,
              message: data.message,
              payload: data,
            };
          }),
          catchError(async (err: any) => {
            console.log('400', err);
            if (err.code !== 'ENOTFOUND') {
              const status = err.response.status;
              throwError(() => new HttpException(err.response.data, status));
              return {
                status: status,
                message: err.data?.message,
                payload: err.data,
              };
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }
}
