import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { DonationModule } from './../src/donation.module';

describe('DonationController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DonationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });
});
