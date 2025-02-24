import { Test, TestingModule } from '@nestjs/testing';

import { DonationController } from './donation.controller';
import { KafkaDonationService } from './donation.service';

describe('DonationController', () => {
  let donationController: DonationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DonationController],
      providers: [KafkaDonationService],
    }).compile();

    donationController = app.get<DonationController>(DonationController);
  });
});
