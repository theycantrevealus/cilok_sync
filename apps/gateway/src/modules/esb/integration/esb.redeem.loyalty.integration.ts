import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import { EsbRedeemLoyaltyCallbackDto } from '../dtos/esb.redeem.loyalty.callback.dto';
import { EsbRedeemLoyaltyCallbackResponseDto } from '../dtos/esb.redeem.loyalty.callback.response.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbRedeemLoyaltyIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, private configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * This serves as a module that enables ESB to receive callback and trigger push notification to subscriber.
   * @param payload EsbRedeemCallbackDTO
   * @param customURLESB String
   * @returns EsbRedeemCallbackDTOResponse
   */
  async callback(
    payload: EsbRedeemLoyaltyCallbackDto,
    customURLESB: string = '',
  ): Promise<EsbRedeemLoyaltyCallbackResponseDto> {
    const responseEsb = new EsbRedeemLoyaltyCallbackResponseDto();
    const transactionClassify =
      EsbTransactionClassifyEnum.redeem_loyalty_callback;

    const requestOptions = this.getRequestOption();

    if (customURLESB !== '') {
      requestOptions['headers']['x-channel'] = payload.channel;
      requestOptions['headers']['x-transaction-id'] = payload.transaction_id;

      console.log(`Target URL callback from redeem : ${customURLESB}`);
      console.log(
        `Header full: ${JSON.stringify(requestOptions['headers'], null, 2)}`,
      );
      this.initHttpService(customURLESB);
      return await lastValueFrom(
        this.getHttpService()
          .post('', payload.body, requestOptions)
          .pipe(
            map(async (res: any) => {
              const data = res?.data;
              const meta = data?.meta;
              responseEsb.status = meta?.status_code === '00000' ? 200 : 400;
              responseEsb.message = meta?.status_desc;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = data;
              console.log(`Response Success : ${JSON.stringify(responseEsb)}`);
              return responseEsb;
            }),
            catchError(async (err: any) => {
              console.error(`Error e2e ${err}`);
              let status = 500;
              if (err.code === 'ECONNABORTED') {
                status = 408;
              }
              responseEsb.status = err?.response?.status ?? status;
              responseEsb.message = err.code;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = err?.response?.data;
              return responseEsb;
            }),
          ),
      );
    } else {
      // Kondisi : Ambil dari callback_url dari configuration
      return await lastValueFrom(
        this.getHttpService()
          .post('loyalty/redeem/callback', payload.body, requestOptions)
          .pipe(
            map(async (res: any) => {
              const data = res?.data;
              const meta = data?.meta;

              responseEsb.status =
                meta.status_code && meta.status_code === '00000' ? 200 : 400;
              responseEsb.message = meta?.status_desc;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = data;
              return responseEsb;
            }),
            catchError(async (err: any) => {
              console.error(`Error e2e ${err}`);
              let status = 500;
              if (err.code === 'ECONNABORTED') {
                status = 408;
              }

              responseEsb.status = err?.response?.status ?? status;
              responseEsb.message = err.code;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = err?.response?.data;
              return responseEsb;
            }),
          ),
      );
    }
  }
}
