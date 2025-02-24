import { Test, TestingModule } from '@nestjs/testing';

import { DeductService } from './deduct.service';

describe('DeductService', () => {
  let service: DeductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeductService],
    }).compile();

    service = module.get<DeductService>(DeductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
