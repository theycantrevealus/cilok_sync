import { Test, TestingModule } from '@nestjs/testing';

import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';

describe('CampaignController', () => {
  let campaignController: CampaignController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [CampaignService],
    }).compile();

    campaignController = app.get<CampaignController>(CampaignController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(campaignController.getHello()).toBe('Hello World!');
    });
  });
});
