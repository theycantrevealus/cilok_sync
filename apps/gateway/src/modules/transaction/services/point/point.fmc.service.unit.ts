import { Test, TestingModule } from '@nestjs/testing';

import { PointFmcService } from './point.fmc.service';

describe('PointFmcService', () => {
  let service: PointFmcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointFmcService],
    }).compile();

    service = module.get<PointFmcService>(PointFmcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
