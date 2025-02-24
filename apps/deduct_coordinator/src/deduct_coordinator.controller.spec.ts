import { Test, TestingModule } from '@nestjs/testing';
import { DeductCoordinatorController } from './deduct_coordinator.controller';
import { DeductCoordinatorService } from './deduct_coordinator.service';

describe('DeductCoordinatorController', () => {
  let deductCoordinatorController: DeductCoordinatorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeductCoordinatorController],
      providers: [DeductCoordinatorService],
    }).compile();

    deductCoordinatorController = app.get<DeductCoordinatorController>(DeductCoordinatorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(deductCoordinatorController.getHello()).toBe('Hello World!');
    });
  });
});
