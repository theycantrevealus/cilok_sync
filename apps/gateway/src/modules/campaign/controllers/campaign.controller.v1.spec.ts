import { Test, TestingModule } from '@nestjs/testing';

import { CampaignControllerV2 } from './campaign.controller.v1';

describe('CampaignControllerV2', () => {
  let controller: CampaignControllerV2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignControllerV2],
    }).compile();

    controller = module.get<CampaignControllerV2>(CampaignControllerV2);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
