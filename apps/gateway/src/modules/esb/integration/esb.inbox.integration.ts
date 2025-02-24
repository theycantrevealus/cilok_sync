import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import { EsbInboxDto, EsbInboxDtoResponse } from '../dtos/esb.inbox.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbInboxIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * The API serves as an approach for a customer to insert an inbox item.
   * @param payload EsbNotificationDTO
   * @returns EsbNotificationDTOResponse
   */
  async post(payload: EsbInboxDto): Promise<EsbInboxDtoResponse> {
    const responseEsb = new EsbInboxDtoResponse();
    const transactionClassify = EsbTransactionClassifyEnum.inbox;
    return await lastValueFrom(
      this.getHttpService()
        .post('customer/inbox', payload, {
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
