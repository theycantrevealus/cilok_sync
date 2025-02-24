import { Test, TestingModule } from '@nestjs/testing';

import { SignoutController } from './signout.controller';

describe('SignoutController', () => {
  let controller: SignoutController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignoutController],
    }).compile();

    controller = module.get<SignoutController>(SignoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
