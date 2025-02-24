import { HttpService } from '@nestjs/axios';
import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AxiosResponse } from 'axios';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import {
  AccountCredentialLog,
  AccountCredentialLogDocument,
} from '@/account/models/account.creadential.log.model';
import { Account, AccountDocument } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { ChannelService } from '@/channel/services/channel.service';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
@Injectable()
export class SignInService {
  private httpService: HttpService;
  private channelService: ChannelService;
  private accountService: AccountService;
  private url: string;
  private raw_core: string;
  private raw_port: number;
  private raw_core_port: string;
  private http;
  constructor(
    httpService: HttpService,
    channelService: ChannelService,
    accountService: AccountService,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(AccountCredentialLog.name)
    private accountCredentialLog: Model<AccountCredentialLogDocument>,

    @Inject(ConfigService) private configService: ConfigService,
  ) {
    this.url = this.configService.get<string>('core-backend.api.token-gateway');
    this.httpService = httpService;
    this.channelService = channelService;
    this.accountService = accountService;
    this.http =
      this.configService.get<string>('core-backend.api.mode') === 'https'
        ? require('https')
        : require('http');
  }

  async CoreSignIn(param: any) {
    const _this: any = this;
    return new Promise((resolve, reject) => {
      if (param && param.auth) {
        const options = {
          method: 'POST',
          hostname: this.raw_core,
          port: this.raw_port,
          path: '/gateway/v3.0/oauth/signin',
          headers: {
            Authorization: `${param.auth}`,
            'Content-Type': 'application/json',
          },
        };

        const req = _this.http.request(options, function (res) {
          const chunks = [];

          res.on('data', function (chunk) {
            chunks.push(chunk);
          });
        });

        req.on('error', function (e) {
          reject(e);
        });

        req.write(JSON.stringify(param.data));

        req.end();
      } else {
        reject('No Header');
      }
    });
  }

  async getSignInData(request: any, ip = ''): Promise<AxiosResponse<any, any>> {
    const rsp = new GlobalTransactionResponse();
    // const channel = await this.channelService.repopulateChannel(ip);

    return await lastValueFrom(
      await this.httpService
        .post(`${this.url}`, request, {
          headers: {
            'Content-Type': 'application/json',
            // Authorization: token,
          },
        })
        .pipe(
          map(async (response) => {
            const data = response.data.payload;

            data.expires_in *= 1000;

            const environment = await this.configService.get<string>(
              'application.environment',
            );

            return {
              code: HttpCodeTransaction.CODE_SUCCESS_200,
              message: 'Success',
              ...data,
            };

            // if (environment === '' || environment === 'development') {
            //   return await this.accountService
            //     .authenticateBusiness({
            //       auth: `Bearer ${data.access_token}`,
            //     })
            //     .then(async (account: any) => {
            //       return await this.accountCredentialLog
            //         .findOneAndUpdate(
            //           { account: account._id, channel: channel },
            //           {
            //             account: account._id,
            //             token: data.access_token,
            //             token_refresh: data.refresh_token,
            //             channel: channel,
            //           },
            //           { upsert: true, new: true },
            //         )
            //         .then(() => {
            //           return {
            //             code: HttpCodeTransaction.CODE_SUCCESS_200,
            //             message: 'Success',
            //             ...data,
            //           };
            //         })
            //         .catch((e) => {
            //           // rsp.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            //           // rsp.message = e.message;
            //           // return rsp;
            //           throw new BadRequestException([{ isUnknown: e.message }]);
            //         });
            //     })
            //     .catch((e) => {
            //       console.log('known', e);
            //       // rsp.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            //       // rsp.message = e.message;
            //       // return rsp;
            //       throw new BadRequestException([{ isUnknown: e.message }]);
            //     });
            // } else {
            //   const dataSet: any = await this.cacheManager.get(
            //     data.access_token,
            //   );
            //   return await this.accountModel
            //     .findOne({ user_name: dataSet.owner.username })
            //     .then(async (account: any) => {
            //       return await this.accountCredentialLog
            //         .findOneAndUpdate(
            //           { account: account._id, channel: channel },
            //           {
            //             account: account._id,
            //             token: data.access_token,
            //             token_refresh: data.refresh_token,
            //             channel: channel,
            //           },
            //           { upsert: true, new: true },
            //         )
            //         .then(() => {
            //           return {
            //             code: HttpCodeTransaction.CODE_SUCCESS_200,
            //             message: 'Success',
            //             ...data,
            //           };
            //         })
            //         .catch((e) => {
            //           // rsp.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            //           // rsp.message = e.message;
            //           // return rsp;
            //           throw new BadRequestException([{ isUnknown: e.message }]);
            //         });
            //     })
            //     .catch((e) => {
            //       throw new BadRequestException([{ isUnknown: e.message }]);
            //     });
            // }
          }),
          catchError(async (e: any) => {
            console.clear();
            console.log('failed', e);
            //  rsp.code = HttpCodeTransaction.ERR_AUTHENTICATE_FAILED_403;
            //  rsp.message = 'Authentication failed';
            //  return rsp;
            throw new BadRequestException([
              {
                isUnauthorized:
                  HttpMsgTransaction.DESC_ERR_AUTHENTICATE_FAILED_403,
              },
            ]);
          }),
        ),
    );
  }

  getUrl(): string {
    return this.url;
  }
}
