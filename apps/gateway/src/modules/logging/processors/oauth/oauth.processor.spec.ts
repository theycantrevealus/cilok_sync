import { Test, TestingModule } from '@nestjs/testing';

import { LogOauthProcessor } from './oauth.processor';

describe('LogOauthPrcessor', () => {
  let processor: LogOauthProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogOauthProcessor],
    }).compile();

    processor = module.get<LogOauthProcessor>(LogOauthProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });
});
