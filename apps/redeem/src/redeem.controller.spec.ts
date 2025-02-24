import { Test, TestingModule } from '@nestjs/testing';

import { RedeemController } from './redeem.controller';
import { RedeemService } from './redeem.service';

describe('RedeemController', () => {
  let redeemController: RedeemController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RedeemController],
      providers: [RedeemService],
    }).compile();

    redeemController = app.get<RedeemController>(RedeemController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      //
    });
  });
});
