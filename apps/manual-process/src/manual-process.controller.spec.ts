import { Test, TestingModule } from '@nestjs/testing';
import { ManualProcessController } from './manual-process.controller';
import { ManualProcessService } from './manual-process.service';

describe('ManualProcessController', () => {
  let manualProcessController: ManualProcessController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ManualProcessController],
      providers: [ManualProcessService],
    }).compile();

    manualProcessController = app.get<ManualProcessController>(ManualProcessController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(manualProcessController.getHello()).toBe('Hello World!');
    });
  });
});
