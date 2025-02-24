import { Test, TestingModule } from '@nestjs/testing';

import { RedeemController } from './redeem.controller';

describe('RedeemController', () => {
  let controller: RedeemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedeemController],
    }).compile();

    controller = module.get<RedeemController>(RedeemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
