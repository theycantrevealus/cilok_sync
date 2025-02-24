import { Test, TestingModule } from '@nestjs/testing';
import { ManualRedeemController } from './manual-redeem.controller';
import { ManualRedeemService } from './manual-redeem.service';

describe('ManualRedeemController', () => {
  let manualRedeemController: ManualRedeemController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ManualRedeemController],
      providers: [ManualRedeemService],
    }).compile();

    manualRedeemController = app.get<ManualRedeemController>(ManualRedeemController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(manualRedeemController.getHello()).toBe('Hello World!');
    });
  });
});
