import { Test, TestingModule } from '@nestjs/testing';
import { ManualRedeemGoogleController } from './manual-redeem-google.controller';
import { ManualRedeemGoogleService } from './manual-redeem-google.service';

describe('ManualRedeemGoogleController', () => {
  let manualRedeemGoogleController: ManualRedeemGoogleController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ManualRedeemGoogleController],
      providers: [ManualRedeemGoogleService],
    }).compile();

    manualRedeemGoogleController = app.get<ManualRedeemGoogleController>(ManualRedeemGoogleController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(manualRedeemGoogleController.getHello()).toBe('Hello World!');
    });
  });
});
