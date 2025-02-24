import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map } from 'rxjs';

import { MyTselTypeEnum } from '../constant/mytsel.type.enum';
import { MyTselPushNotifDto } from '../dtos/mytsel.pushnotif.dto';
import { MyTselResponseInboxPushNotif } from '../dtos/mytsel.response.inbox.pushnotif';
import { MyTselConfigIntegration } from './mytsel.config.integration';

@Injectable()
export class MyTselPushNotifIntegration extends MyTselConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  async execute(
    payload: MyTselPushNotifDto,
  ): Promise<MyTselResponseInboxPushNotif> {
    let retry = 0;
    let result: MyTselResponseInboxPushNotif;

    if (retry < 2) {
      result = await this.post(payload);
      console.log(result);
      retry++;
    }

    return result;
  }

  /**
   * The API serves as an approach for a customer to insert an inbox item using MyTsel service.
   * @param payload MyTselInboxDto
   * @returns MyTselInboxPushNotifResponse
   */
  async post(
    payload: MyTselPushNotifDto,
  ): Promise<MyTselResponseInboxPushNotif> {
    const responseMyTsel = new MyTselResponseInboxPushNotif();
    const transactionClassify = MyTselTypeEnum.pushNotif;

    return await lastValueFrom(
      this.getHttpService()
        .post('api/indihome/fmc/notification', payload, {
          headers: this.getHeader(),
          timeout: 5000,
        })
        .pipe(
          map(async (res) => {
            const data = res.data;

            // from IFA, is not return statusCode, its mean success
            responseMyTsel.status = data?.statusCode ?? 200;
            responseMyTsel.message = data?.message;
            responseMyTsel.transaction_classify = transactionClassify;
            responseMyTsel.payload = res.data;
            return responseMyTsel;
          }),
          catchError(async (err: any) => {
            console.log(err);
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
