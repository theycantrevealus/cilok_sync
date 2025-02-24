import { Test, TestingModule } from '@nestjs/testing';
import { ExternalBonusController } from './external-bonus.controller';
import { ExternalBonusService } from './external-bonus.service';

describe('ExternalBonusController', () => {
  let externalBonusController: ExternalBonusController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ExternalBonusController],
      providers: [ExternalBonusService],
    }).compile();

    externalBonusController = app.get<ExternalBonusController>(ExternalBonusController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(externalBonusController.getHello()).toBe('Hello World!');
    });
  });
});
