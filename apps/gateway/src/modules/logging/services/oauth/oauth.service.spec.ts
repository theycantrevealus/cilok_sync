import { Test, TestingModule } from '@nestjs/testing';

import {
  LogOauthRefreshTokenService,
  LogOauthSignInService,
  LogOauthSignOutService,
} from './oauth.service';

describe('LogOauthRefreshTokenService', () => {
  let service: LogOauthRefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthRefreshTokenService],
    }).compile();

    service = module.get<LogOauthRefreshTokenService>(
      LogOauthRefreshTokenService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('LogOauthSignInService', () => {
  let service: LogOauthSignInService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthSignInService],
    }).compile();

    service = module.get<LogOauthSignInService>(LogOauthSignInService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('LogOauthSignOutService', () => {
  let service: LogOauthSignOutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthSignOutService],
    }).compile();

    service = module.get<LogOauthSignOutService>(LogOauthSignOutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
