import { Test, TestingModule } from '@nestjs/testing';
import { DeductLowController } from './deduct_low.controller';
import { DeductLowService } from './deduct_low.service';

describe('DeductLowController', () => {
  let deductLowController: DeductLowController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeductLowController],
      providers: [DeductLowService],
    }).compile();

    deductLowController = app.get<DeductLowController>(DeductLowController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(deductLowController.getHello()).toBe('Hello World!');
    });
  });
});
