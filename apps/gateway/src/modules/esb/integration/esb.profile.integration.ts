import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { EsbTransactionClassifyEnum } from '../constans/esb.transactionclassify.enum';
import { EsbProfileDTO, EsbProfileDTOResponse } from '../dtos/esb.profile.dto';
import { EsbConfigIntegration } from './esb.config.integration';

@Injectable()
export class EsbProfileIntegration extends EsbConfigIntegration {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    // this.initHttpService();
  }

  /**
   * @param payload EsbProfileDTO
   * @returns EsbProfileDTOResponse
   */
  async post(payload: EsbProfileDTO): Promise<EsbProfileDTOResponse> {
    const responseEsb = new EsbProfileDTOResponse();
    const transactionClassify = EsbTransactionClassifyEnum.dsp_location;
    // console.log('this.getRequestOption() : ', this.getRequestOption());
    // console.log('request : ', `${this.getUrl()}service/network/profile`, {
    //   params: payload,
    //   headers: this.getHeader(),
    // });
    return await lastValueFrom(
      this.getHttpService()
        .get(`${this.getUrl() + this.getUrlDSP()}`, {
          params: payload,
          ...this.getRequestOption(),
        })
        .pipe(
          map(async (res) => {
            // console.log(res);
            const data = res.data;
            responseEsb.status = res?.status;
            responseEsb.message = data?.message;
            responseEsb.transaction_classify = transactionClassify;
            responseEsb.payload = res?.data;
            // console.log('responseEsb', responseEsb);
            return responseEsb;
          }),
          catchError(async (err: any) => {
            // console.log('response esb : ', err);
            // console.log('response esb data : ', err.response.data);
            if (err.code !== 'ENOTFOUND') {
              const status = err?.response?.status;
              // throwError(
              //   () => new HttpException(err.response.data, status),
              // );
              responseEsb.status = status;
              responseEsb.message = err?.data?.message;
              responseEsb.transaction_classify = transactionClassify;
              responseEsb.payload = err.response.data;
              // console.log(responseEsb);
              return responseEsb;
            } else {
              // console.log(err);
              // throw new BadRequestException([err.message])
            }
          }),
        ),
    );
  }
}
