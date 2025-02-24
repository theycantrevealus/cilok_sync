import { Test, TestingModule } from '@nestjs/testing';

import { DeductController } from './deduct.controller';

describe('DeductController', () => {
  let controller: DeductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeductController],
    }).compile();

    controller = module.get<DeductController>(DeductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
