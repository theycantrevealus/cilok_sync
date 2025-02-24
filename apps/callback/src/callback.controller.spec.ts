import { Test, TestingModule } from '@nestjs/testing';
import { CallbackController } from './callback.controller';
import { CallbackService } from './callback.service';

describe('CallbackController', () => {
  let callbackController: CallbackController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CallbackController],
      providers: [CallbackService],
    }).compile();

    callbackController = app.get<CallbackController>(CallbackController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(callbackController.getHello()).toBe('Hello World!');
  //   });
  // });
});
