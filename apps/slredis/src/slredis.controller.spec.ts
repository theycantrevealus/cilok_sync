import { Test, TestingModule } from '@nestjs/testing';

import { SlRedisController } from './slredis.controller';
import { SlRedisService } from './slredis.service';

describe('SlRedisController', () => {
  let slRedisController: SlRedisController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SlRedisController],
      providers: [SlRedisService],
    }).compile();

    slRedisController = app.get<SlRedisController>(SlRedisController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(slRedisController.getHello()).toBe('Hello World!');
  //   });
  // });
});
