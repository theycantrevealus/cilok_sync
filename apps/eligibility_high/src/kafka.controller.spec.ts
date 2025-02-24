import { Test, TestingModule } from '@nestjs/testing';

import { KafkaController } from './kafka.controller';
import { KafkaService } from './kafka.service';

describe('KafkaController', () => {
  let kafkaController: KafkaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [KafkaController],
      providers: [KafkaService],
    }).compile();

    kafkaController = app.get<KafkaController>(KafkaController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(kafkaController.getHello()).toBe('Hello World!');
  //   });
  // });
});
