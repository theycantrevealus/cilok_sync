import { Test, TestingModule } from '@nestjs/testing';

import { CampaignServiceV1 } from '@/campaign/services/campaign.service.v1';

describe('CampaignServiceV1', () => {
  let service: CampaignServiceV1;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignServiceV1],
    }).compile();

    service = module.get<CampaignServiceV1>(CampaignServiceV1);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
