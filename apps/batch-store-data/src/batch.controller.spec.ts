import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch-store-data.controller';
import { BatchStoreDataService } from './batch-store-data.service';

describe('BatchController', () => {
  let batchController: BatchController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [BatchStoreDataService],
    }).compile();

    batchController = app.get<BatchController>(BatchController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(batchController.getHello()).toBe('Hello World!');
    });
  });
});
