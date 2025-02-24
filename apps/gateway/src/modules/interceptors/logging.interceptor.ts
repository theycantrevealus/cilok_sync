import { CacheStore } from '@nestjs/cache-manager';
import {
  CACHE_MANAGER,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { Cache } from 'cache-manager';
import { FastifyRequest } from 'fastify';
import { Model, Types } from 'mongoose';
import * as requestIp from 'request-ip';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AccountCredentialLog } from '@/account/models/account.creadential.log.model';
import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import { ChannelService } from '@/channel/services/channel.service';
import { APILog } from '@/logging/models/api.logs.model';

export interface Response<T> {
  data: T;
}

function isExpressRequest(
  request: Request | FastifyRequest,
): request is Request {
  return (request as FastifyRequest) === undefined;
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    @InjectModel(APILog.name) private readonly apiLogModel: Model<APILog>,

    @InjectModel(AccountCredentialLog.name)
    private readonly credLogModel: Model<APILog>,

    @Inject(ChannelService) private channelService: ChannelService,

    @Inject(AccountService) private accountService: AccountService,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ConfigService) private configService: ConfigService,
  ) {
    //
  }

  // private logger = new Logger('HTTP');

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const request = await http.getRequest();
    const header_token = isExpressRequest(request)
      ? request.headers['Authorization']
      : (request as FastifyRequest).headers.authorization;

    // const ip = request.clientIp
    //   ? request.clientIp
    //   : requestIp.getClientIp(request);

    // const channel = await this.channelService.repopulateChannel(ip);
    const channel = null;
    const { url } = request;
    const token = header_token.split(' ')[1];
    const method = isExpressRequest(request)
      ? request.method
      : (request as FastifyRequest).method;

    const SLI_id = new Types.ObjectId();
    let curr_date = new Date().toISOString().split('T')[0];
    // const SLItracing_id = `SLI_${curr_date}_${SLI_id.toString()}`;
    const now = Date.now();
    // const account = await this.accountService
    //   .identifyBusiness(
    //     {
    //       auth: `Bearer ${token}`,
    //     },
    //     channel,
    //   )
    //   .then((ab) => {
    //     return ab;
    //   });

    // const getAccount = await this.credLogModel.findOne({ token: token });
    // let account;
    // if (getAccount && getAccount.account) {
    //   account = await this.accountService.detail(getAccount.account.toString());
    // } else {
    //   account = await this.accountService
    //     .identifyBusiness(
    //       {
    //         auth: `Bearer ${token}`,
    //       },
    //       channel,
    //     )
    //     .then((ab) => {
    //       return ab;
    //     });
    // }

    let account: any;
    const environment = await this.configService.get<string>(
      'application.environment',
    );
    if (environment === '' || environment === 'development') {
      account = await this.accountService.identifyBusiness(
        { auth: header_token },
        channel,
      );
    } else {
      account = await this.cacheManager.get<any>(token);
    }

    // await new this.apiLogModel({
    //   _id: SLI_id,
    //   type: 'request',
    //   tracing_id: SLItracing_id,
    //   path: url,
    //   headers: request.headers,
    //   method: method,
    //   body: body,
    //   account: account,
    //   activity: '',
    // }).save();

    try {
      return next.handle().pipe(
        map(async (response) => {
          const transaction_classify =
            response && response.transaction_classify
              ? response.transaction_classify.toString()
              : 'UNDEFINED_TRANSACTION';

          const trace_custom_code =
            response && response.trace_custom_code
              ? response.trace_custom_code.toString()
              : 'UND';

          const SLO_id =
            response && response.transaction_id
              ? response.transaction_id
              : new Types.ObjectId();

          curr_date = new Date().toISOString().split('T')[0];
          const SLO_tracing_id = `SLO_${curr_date}_${SLO_id.toString()}`;

          if (response?.payload && response?.payload?.trace_id === true) {
            response.payload.trace_id =
              trace_custom_code === 'UND'
                ? SLO_tracing_id
                : `${trace_custom_code}_${curr_date}_${SLO_id}`;
          }

          // START RESPONSE ATTACHMENT
          const isAttachment = response?.stream?._readableState?.buffer;
          // END RESPONSE ATTACHMENT

          // await new this.apiLogModel({
          //   _id: SLO_id,
          //   type: 'response',
          //   tracing_id:
          //     isAttachment != undefined
          //       ? 'attachment'
          //       : response.payload.trace_id,
          //   path: url,
          //   headers: {},
          //   method: method,
          //   body: response,
          //   account: account,
          //   activity: transaction_classify,
          // }).save();

          if (account?.owner?.username) {
            account = await this.accountService.find_by({
              user_name: account.owner.username,
            });
          }

          let accountSet = {};

          if (account) {
            accountSet = {
              _id: account?._id.toString(),
              user_name: account.user_name,
              email: account.email,
            };
          } else {
            // Occuring when data sync is not running, so need to check if not null
            if (
              account !== null &&
              'email' in account &&
              'user_name' in account
            ) {
              accountSet = {
                user_name: account.user_name,
                email: account.email,
              };
            } else {
              accountSet = {
                user_name: 'empty_username',
                email: 'empty_email',
              };
            }
          }

          const logData = {
            statusCode: `${http.getResponse().statusCode} - ${
              response?.status ?? response?.statusCode ?? response?.code
            }`,
            level: 'VERBOSE',
            transaction_id:
              isAttachment != undefined
                ? 'attachment'
                : response?.payload?.trace_id ?? '',
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - now,
            payload: {
              service: 'GATEWAY',
              method: method,
              url: url,
              user_id: accountSet,
              step: transaction_classify,
              param: request.body,
              result: response.response ?? response.payload,
            },
          };

          await this.logger.verbose(logData);

          if (response.transaction_classify) {
            delete response.transaction_classify;
            delete response.trace_custom_code;
          }

          if (response.payload?.core) {
            delete response.payload.core;
          }

          if (response.payload?.customer) {
            delete response.payload.customer;
          }

          if (response.payload?.program) {
            delete response.payload.program;
          }

          if (response.payload?.keyword) {
            delete response.payload.keyword;
          }

          if (response.payload?.campaign) {
            delete response.payload.campaign;
          }

          if (response.payload?.redeem) {
            delete response.payload.redeem;
          }

          if (response.payload?.payload) {
            delete response.payload?.payload;
          }

          if (response?.payload?.json) {
            delete response.payload?.json;
          }

          if (response.payload?.error_message) {
            delete response.payload?.error_message;
          }

          return response;
        }),
      );
    } catch (e) {
      return e.message;
    }
  }
}
