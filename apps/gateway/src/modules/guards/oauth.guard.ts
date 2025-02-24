import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { AuthGuard } from '@nestjs/passport';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';

// import * as requestIp from 'request-ip';
import { AccountCredentialLog } from '@/account/models/account.creadential.log.model';
import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { ChannelService } from '@/channel/services/channel.service';
import { APILog } from '@/logging/models/api.logs.model';

@Injectable()
export class OAuth2Guard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private channelService: ChannelService,
    private accountService: AccountService,
    @InjectModel(AccountCredentialLog.name)
    private readonly credLogModel: Model<APILog>,
    @Inject(ConfigService) private configService: ConfigService,
    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
  ) {
    super();
  }

  handleRequest(err, account) {
    if (err || !account) {
      throw err || new UnauthorizedException();
    }
    return account;
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const secured = this.reflector.get<string[]>(
      'secured',
      context.getHandler(),
    );

    if (!secured) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest();
    if (!request.headers.authorization) {
      console.log('No Account');
      throw new ForbiddenException([{ isTokenMissing: 'Token is Required' }]);
      // new UnauthorizedException('No Account');
      // return false;
    }

    // const ip = request.clientIp
    //   ? request.clientIllladp
    //   : requestIp.getClientIp(request);

    // const channel = await this.channelService.repopulateChannel(ip);
    const channel = null;
    const header_token = request.headers.authorization;
    const token = header_token.split(' ')[1];
    if (!token) {
      throw new ForbiddenException([{ isTokenMissing: 'Token is Required' }]);
    }
    let access = true;

    const apiFormat =
      request.context.config.url.toString().split('?')[0] ??
      request.url.toString().split('?')[0];

    console.log(
      `[ACCESS CONTROL] - Request access for endpoint : ${apiFormat}`,
    );

    if (
      // request.originalUrl === '/v1/oauth/signin' ||
      // request.originalUrl === '/v1/oauth/refresh-token' ||
      apiFormat === '/v1/oauth/signin' ||
      apiFormat === '/v1/oauth/refresh-token'
    ) {
      access = true;
    } else {
      // const getAccount = await this.credLogModel.findOne({ token: token });
      let account: any;
      const environment = await this.configService.get(
        'application.environment',
      );

      let authorizeList: any = account?.core_payload?.authorizes ?? [];

      if (environment === '' || environment === 'development') {
        await this.accountService
          .identifyBusiness({ auth: header_token }, channel)
          .then((result) => {
            account = result;
          })
          .catch((e) => {
            account = null;
          });
        authorizeList = account?.core_payload?.authorizes ?? [];
      } else {
        account = await this.cacheManager.get<any>(token);
        authorizeList = account?.authorizes ?? [];
        if (account?.owner?.username) {
          console.log(
            `[ACCESS CONTROL] - Account : ${account?.owner?.username}`,
          );
          account = await this.accountService.find_by({
            user_name: account.owner.username,
          });
        }
      }

      console.log(
        `========================================\n\nToken check : ${header_token}\n\n========================================`,
      );
      if (!account) {
        console.log(
          '[ACCESS CONTROL] - Error: Refresh/Access Token not found or expired',
        );
        throw new UnauthorizedException([
          {
            isTokenNotFoundOrExpired:
              'Error: Refresh/Access Token not found or expired',
          },
        ]);
      }

      // return account !== null && account !== undefined;

      // return true;

      // DATA ROLE DARI CORE

      const authorizeListObject = Object.assign(
        {},
        ...authorizeList.map((item) => ({
          [item.object_code]: item.action_codes,
        })),
      );
      // console.log(`List Role From Core :`);
      // console.log(authorizeListObject);
      //
      // console.log(
      //   '================== ROLE MANAGEMENT LOG ====================',
      // );
      const originalURL = request.originalUrl;
      // const apiFormat = request.route.path;
      // const apiFormat = request.url;

      const method = request.method;
      const methodGroup = method == 'GET' ? 'Read' : 'Write';
      // const roleFromDB = await this.accountService.getRoleMap(apiFormat);
      const roleFromDB: string = await this.cacheManager.get(apiFormat);

      // console.log(roleFromDB);
      // let access = false; // Default is false until core database from preprod 1 deployed

      //
      if (account) {
        request.account = account;
        // access = true;

        if (roleFromDB) {
          // if API exists in DB

          if (authorizeListObject[roleFromDB]) {
            // if RoleDB match with RoleCoreList
            if (!(authorizeListObject[roleFromDB].indexOf(methodGroup) >= 0)) {
              //if access role is allow
              access = true;
            }
          } else {
            if (
              apiFormat === '/v1/configuration/populate' ||
              apiFormat === '/v1/oauth/refresh-token' ||
              apiFormat === '/v1/oauth/signin'
            ) {
              access = true;
            } else {
              console.log(
                '[ACCESS CONTROL] - Role from DB is not exists in Role from Core..',
              );
              // access = false;
              access = true;
            }
            // if (
            //   request.originalUrl === '/v1/configuration/populate' ||
            //   request.originalUrl === '/v1/oauth/refresh-token' ||
            //   request.originalUrl === '/v1/oauth/signin'
            // ) {
            //   access = true;
            // } else {
            //   console.log('>> Role from DB is not exists in Role from Core..');
            //   // access = true;
            //   access = false;
            // }
          }
        } else {
          access = true;
          console.log('[ACCESS CONTROL] - API is not found in database..!!');
        }
      } else {
        console.log('[ACCESS CONTROL] - Account not identified');
        access = false;
      }

      /* RESTRICTION MODE ================================================================================
       *
       * THIS BLOCK TO ALLOW ALL PERMISSION EVEN IT IS NOT REGISTERED ON AUTHORIZATION COLLECTION
       * THE DEFAULT IS FALSE SO IT WILL NOT CHECK FOR THE PERMISSION */

      const permissionRestriction: boolean =
        (await this.applicationService.getConfig(
          'PERMISSION_RESTRICTION_CHECK',
        )) || false;
      if (!permissionRestriction) {
        access = true;
      }

      // =================================================================================================

      if (!access) {
        console.log(
          '[ACCESS CONTROL] - Error: Refresh/Access Token not found or expired',
        );
        throw new UnauthorizedException([
          {
            isTokenNotFoundOrExpired:
              'Error: Refresh/Access Token not found or expired',
          },
        ]);
      }
    }

    return true;
  }
}
