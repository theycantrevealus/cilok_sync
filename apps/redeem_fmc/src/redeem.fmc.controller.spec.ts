import { Test, TestingModule } from '@nestjs/testing';

import { RedeemFmcController } from './redeem.fmc.controller';
import { RedeemFmcService } from './redeem.fmc.service';

describe('RedeemController', () => {
  let redeemController: RedeemFmcController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RedeemFmcService],
      providers: [RedeemFmcService],
    }).compile();

    redeemController = app.get<RedeemFmcController>(RedeemFmcController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      //
    });
  });
});
