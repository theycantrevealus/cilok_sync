import { Test, TestingModule } from '@nestjs/testing';

import {
  LogOauthRefreshTokenService,
  LogOauthSignInService,
  LogOauthSignOutService,
} from '../services/oauth/oauth.service';
import {
  LogOauthRefreshTokenMiddleware,
  LogOauthSignInMiddleware,
  LogOauthSignOutMiddleware,
} from './oauth.middleware';

describe('LogOauthRefreshTokenMiddleware', () => {
  let service: LogOauthRefreshTokenService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthRefreshTokenService],
    }).compile();

    service = module.get<LogOauthRefreshTokenService>(
      LogOauthRefreshTokenService,
    );
  });

  it('should be defined', () => {
    expect(new LogOauthRefreshTokenMiddleware(service)).toBeDefined();
  });
});

describe('LogOauthSignInMiddleware', () => {
  let service: LogOauthSignInService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthSignInService],
    }).compile();

    service = module.get<LogOauthSignInService>(LogOauthSignInService);
  });

  it('should be defined', () => {
    expect(new LogOauthSignInMiddleware(service)).toBeDefined();
  });
});

describe('LogOauthSignOutMiddleware', () => {
  let service: LogOauthSignOutService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthSignOutService],
    }).compile();

    service = module.get<LogOauthSignOutService>(LogOauthSignOutService);
  });

  it('should be defined', () => {
    expect(new LogOauthSignOutMiddleware(service)).toBeDefined();
  });
});
