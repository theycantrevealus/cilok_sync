import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import { NgrsDTOResponse } from '../dtos/esb.order.dto';
import { NgrsRechargeDto } from '../dtos/ngrs.recharge.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbNgrsIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
  }

  /**
   * This service is intended to initiate stock deduction and regular recharge.
   * @param payload NgrsRechargeDto
   * @returns NgrsDTOResponse
   */
  async post(payload: NgrsRechargeDto): Promise<NgrsDTOResponse> {
    const responseEsb = new NgrsDTOResponse();
    const transactionClassify = EsbTransactionClassifyEnum.NGRS;

    console.log('<--- payload :: esb service integration -->');
    console.log(payload);
    console.log('<--- payload :: esb service integration -->');

    console.log('<--- information :: esb service integration -->');
    console.log(`${this.getUrl()}modern/recharge/dealer`);
    console.log(this.getHeader());
    console.log('<--- information :: esb service integration -->');

    return await lastValueFrom(
      this.getHttpService()
        .post(
          this.getUrl() + 'modern/recharge/dealer',
          payload,
          this.getRequestOption(),
        )
        .pipe(
          map(async (res) => {
            console.log('<--- success :: esb response integration -->');
            console.log(res);
            console.log('<--- success :: esb response integration -->');

            const data = res?.data;
            responseEsb.status = res?.status;
            responseEsb.message = data?.message;
            responseEsb.transaction_classify = transactionClassify;
            responseEsb.payload = res.data;

            console.log('<--- success :: esb service integration -->');
            console.log(responseEsb);
            console.log('<--- success :: esb service integration -->');

            return responseEsb;
          }),
          catchError(async (err: any) => {
            console.log('<--- fail #0 :: esb error integration -->');
            console.log(err);
            console.log('<--- fail #0 :: esb error integration -->');
            if (err.code !== 'ENOTFOUND') {
              const status = err?.response?.status;

              console.log('<--- fail #1 :: esb service integration -->');
              console.log('status : ', status);
              console.log('data : ', err?.response?.data);
              console.log('<--- fail #1 :: esb service integration -->');

              throwError(() => new HttpException(err.response?.data, status));
              responseEsb.status = status;
              responseEsb.message = err?.response?.statusText;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = err?.response?.data;

              console.log('<--- fail #2 :: esb service integration -->');
              console.log(responseEsb);
              console.log('<--- fail #2 :: esb service integration -->');

              return responseEsb;
            } else {
              console.log('<--- fail #3 :: esb service integration -->');
              console.log(err.message ? err.message : err);
              console.log('<--- fail #3 :: esb service integration -->');

              throw new BadRequestException(err.message ? err.message : err);
            }
          }),
        ),
    );
  }
}
