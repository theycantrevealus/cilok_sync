import { Test, TestingModule } from '@nestjs/testing';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';

describe('RefundController', () => {
  let refundController: RefundController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RefundController],
      providers: [RefundService],
    }).compile();

    refundController = app.get<RefundController>(RefundController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(refundController.getHello()).toBe('Hello World!');
    });
  });
});
