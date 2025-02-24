import { Test, TestingModule } from '@nestjs/testing';

import { RedeemService } from './redeem.service';

describe('RedeemService', () => {
  let service: RedeemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedeemService],
    }).compile();

    service = module.get<RedeemService>(RedeemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
