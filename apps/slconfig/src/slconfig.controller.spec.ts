import { Test, TestingModule } from '@nestjs/testing';
import { SlconfigController } from './slconfig.controller';
import { SlconfigService } from './slconfig.service';

describe('SlconfigController', () => {
  let slconfigController: SlconfigController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SlconfigController],
      providers: [SlconfigService],
    }).compile();

    slconfigController = app.get<SlconfigController>(SlconfigController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(slconfigController.getHello()).toBe('Hello World!');
  //   });
  // });
});
