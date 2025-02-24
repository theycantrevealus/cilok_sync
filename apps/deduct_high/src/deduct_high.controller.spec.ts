import { Test, TestingModule } from '@nestjs/testing';
import { DeductHighController } from './deduct_high.controller';
import { DeductHighService } from './deduct_high.service';

describe('DeductHighController', () => {
  let deductHighController: DeductHighController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeductHighController],
      providers: [DeductHighService],
    }).compile();

    deductHighController = app.get<DeductHighController>(DeductHighController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(deductHighController.getHello()).toBe('Hello World!');
    });
  });
});
