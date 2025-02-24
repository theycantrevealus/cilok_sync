import { Test, TestingModule } from '@nestjs/testing';
import { DeductCoordinatorEmitterController } from './deduct_coordinator_emitter.controller';
import { DeductCoordinatorEmitterService } from './deduct_coordinator_emitter.service';

describe('DeductCoordinatorEmitterController', () => {
  let deductCoordinatorEmitterController: DeductCoordinatorEmitterController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeductCoordinatorEmitterController],
      providers: [DeductCoordinatorEmitterService],
    }).compile();

    deductCoordinatorEmitterController = app.get<DeductCoordinatorEmitterController>(DeductCoordinatorEmitterController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(deductCoordinatorEmitterController.getHello()).toBe('Hello World!');
    });
  });
});
