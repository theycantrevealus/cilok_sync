import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';

import { MyTselTypeEnum } from '../constant/mytsel.type.enum';
import { MyTselInboxDto } from '../dtos/mytsel.inbox.dto';
import { MyTselResponseInboxPushNotif } from '../dtos/mytsel.response.inbox.pushnotif';
import { MyTselConfigIntegration } from './mytsel.config.integration';

@Injectable()
export class MyTselInboxIntegration extends MyTselConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  /**
   * The API serves as an approach for a customer to insert an inbox item using MyTsel service.
   * @param payload MyTselInboxDto
   * @returns MyTselInboxPushNotifResponse
   */
  async post(payload: MyTselInboxDto): Promise<MyTselResponseInboxPushNotif> {
    const responseMyTsel = new MyTselResponseInboxPushNotif();
    const transactionClassify = MyTselTypeEnum.inbox;

    return await lastValueFrom(
      this.getHttpService()
        .post('api/indihome/fmc/notification', payload, {
          headers: this.getHeader(),
        })
        .pipe(
          map(async (res) => {
            const data = res.data;

            // from IFA, is not return statusCode, its mean success
            responseMyTsel.status = data?.statusCode ?? 200;
            responseMyTsel.message = data?.message;
            responseMyTsel.transaction_classify = transactionClassify;
            responseMyTsel.payload = res.data;
            console.log(responseMyTsel);
            return responseMyTsel;
          }),
          catchError(async (err: any) => {
            if (err.code === 'ECONNABORTED') {
              const status = 408;
              responseMyTsel.status = status;
              responseMyTsel.message = err.code;
              responseMyTsel.transaction_classify = transactionClassify;
              responseMyTsel.payload = err.data;
              return responseMyTsel;
            } else {
              console.log(err);
            }

            responseMyTsel.status = 500;
            responseMyTsel.message = err.message;
            return responseMyTsel;
          }),
        ),
    );
  }
}
