import { Test, TestingModule } from '@nestjs/testing';
import { BatchConsumerController } from './batch-consumer.controller';
import { BatchConsumerService } from './batch-consumer.service';

describe('BatchConsumerController', () => {
  let batchConsumerController: BatchConsumerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BatchConsumerController],
      providers: [BatchConsumerService],
    }).compile();

    batchConsumerController = app.get<BatchConsumerController>(BatchConsumerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(batchConsumerController.getHello()).toBe('Hello World!');
    });
  });
});
