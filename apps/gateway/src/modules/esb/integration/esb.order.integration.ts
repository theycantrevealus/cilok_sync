import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import { EsbOrderDTO, EsbOrderDTOResponse } from '../dtos/esb.order.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbOrderIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * This serves as a module to perform submit order coming from various channels. ESB will performs Purchase Validation before submitting the request to Digital Order Management (DOM). DOM is a system which will handle order decomposition, order orchestration and order fulfillment.
   * @param payload EsbOrderDTO
   * @returns EsbOrderDTOResponse
   */
  async post(payload: EsbOrderDTO): Promise<EsbOrderDTOResponse> {
    const responseEsb = new EsbOrderDTOResponse();
    const transactionClassify = EsbTransactionClassifyEnum.submit_order;
    return await lastValueFrom(
      this.getHttpService()
        .post('order/submit', payload, {
          headers: this.getHeader(),
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            responseEsb.status = res.status;
            responseEsb.message = data?.message;
            responseEsb.transaction_classify = transactionClassify;
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
              responseEsb.message = err.data?.message;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = err.data;
              console.log(responseEsb);
              return responseEsb;
            } else {
              console.log(err);
              // throw new BadRequestException([err.message])
            }
          }),
        ),
    );
  }
}
