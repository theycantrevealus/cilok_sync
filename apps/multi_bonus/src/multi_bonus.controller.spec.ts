import { Test, TestingModule } from '@nestjs/testing';
import { MultiBonusController } from './multi_bonus.controller';
import { MultiBonusService } from './multi_bonus.service';

describe('MultiBonusController', () => {
  let multiBonusController: MultiBonusController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MultiBonusController],
      providers: [MultiBonusService],
    }).compile();

    multiBonusController = app.get<MultiBonusController>(MultiBonusController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(multiBonusController.getHello()).toBe('Hello World!');
  //   });
  // });
});
