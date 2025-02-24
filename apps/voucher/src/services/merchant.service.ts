import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { APILog } from '@/logging/models/api.logs.model';

@Injectable()
export class MerchantService {
  private httpService: HttpService;
  private url: string;
  private merchant: string;

  constructor(httpService: HttpService, configService: ConfigService) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }
  async getMerchantSelf(token: string): Promise<any> {
    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/merchant-setting/${this.merchant}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            return res.data;
          }),
          catchError(async (e: BadRequestException) => {
            // throw new BadRequestException(e.message);
            console.log(e);
          }),
        ),
    );
}

}
