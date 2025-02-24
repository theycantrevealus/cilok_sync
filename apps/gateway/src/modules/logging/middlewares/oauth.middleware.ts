import { Injectable, NestMiddleware } from '@nestjs/common';

import {
  LogOauthRefreshTokenService,
  LogOauthSignInService,
  LogOauthSignOutService,
} from '../services/oauth/oauth.service';

@Injectable()
export class LogOauthSignInMiddleware implements NestMiddleware {
  private logService: LogOauthSignInService;

  constructor(logService: LogOauthSignInService) {
    this.logService = logService;
  }

  use(req: any, res: any, next: () => void) {
    this.logService.logRequest('/oauth/signin', req);

    next();
  }
}

@Injectable()
export class LogOauthSignOutMiddleware implements NestMiddleware {
  private logService: LogOauthSignOutService;

  constructor(logService: LogOauthSignOutService) {
    this.logService = logService;
  }

  use(req: any, res: any, next: () => void) {
    this.logService.logRequest('/oauth/signout', req);

    next();
  }
}

@Injectable()
export class LogOauthRefreshTokenMiddleware implements NestMiddleware {
  private logService: LogOauthRefreshTokenService;

  constructor(logService: LogOauthRefreshTokenService) {
    this.logService = logService;
  }

  use(req: any, res: any, next: () => void) {
    this.logService.logRequest('/oauth/refresh-token', req);

    next();
  }
}
