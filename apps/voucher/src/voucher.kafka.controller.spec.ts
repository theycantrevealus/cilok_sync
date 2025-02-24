import { Test, TestingModule } from '@nestjs/testing';

import { VoucherController } from './voucher.kafka.controller';
import { VoucherService } from './voucher.kafka.service';

describe('VoucherController', () => {
  let voucherController: VoucherController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VoucherController],
      providers: [VoucherService],
    }).compile();

    voucherController = app.get<VoucherController>(VoucherController);
  });
});
