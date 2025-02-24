import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import {
  EsbRedeemCallbackRequestPayloadDTO,
  EsbRedeemCallbackResponseDTO,
} from '../dtos/esb.redeem.callback.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbRedeemIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * This serves as a module that enables ESB to receive callback and trigger push notification to subscriber.
   * @param payload EsbRedeemCallbackDTO
   * @returns EsbRedeemCallbackDTOResponse
   */
  async callback(
    payload: EsbRedeemCallbackRequestPayloadDTO,
  ): Promise<EsbRedeemCallbackResponseDTO> {
    const responseEsb = new EsbRedeemCallbackResponseDTO();
    const transactionClassify = EsbTransactionClassifyEnum.redeem_callback;
    return await lastValueFrom(
      this.getHttpService()
        .post('Points/Service/RedeemCallback', payload.body, {
          headers: this.getHeader(),
          params: payload.query_params,
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
              // throwError(() => new HttpException(err.response.data, status));
              responseEsb.status = status;
              responseEsb.message = err.data?.message;
              responseEsb.transaction_classify = transactionClassify;
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
