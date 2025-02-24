import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { response } from 'express';
import { catchError, lastValueFrom, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { EsbGetBalanceDTOResponse } from '@/esb/dtos/esb.getbalance.response';
import { EsbConfigIntegration } from '@/esb/integration/esb.config.integration';

@Injectable()
export class EsbTransactionIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * This serves as module to perform get balance from ESBJ
   * @param params
   * @return EsbGetBalanceDTOResponse
   */
  async getBalance(params: any): Promise<EsbGetBalanceDTOResponse> {
    const responseEsb = new EsbGetBalanceDTOResponse();
    const orgCode = params.organization_code;
    delete params['organization_code'];

    return await lastValueFrom(
      this.getHttpService()
        .get(`modern/dealer/${orgCode}/balance`, {
          headers: this.getHeader(),
          params: params,
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            responseEsb.status = res.status;
            responseEsb.message = data?.message;
            responseEsb.payload = res.data;
            return responseEsb;
          }),
          catchError(async (err: any) => {
            if (err.code !== 'ENOTFOUND') {
              const status = err.response.status;
              // throwError(
              //   () => new HttpException(err.response.data, status),
              // );
              responseEsb.status = status;
              responseEsb.message = err.data?.status;
              responseEsb.payload = err.data;
              console.log(responseEsb);
              return responseEsb;
            } else {
              console.log(err);
              // throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }
}
