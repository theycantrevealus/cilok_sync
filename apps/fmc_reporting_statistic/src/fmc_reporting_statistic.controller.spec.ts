import { Test, TestingModule } from '@nestjs/testing';

import { FmcReportingStatisticController } from './fmc_reporting_statistic.controller';
import { FmcReportingStatisticService } from './fmc_reporting_statistic.service';

describe('FmcReportingStatisticController', () => {
  let fmcReportingStatisticController: FmcReportingStatisticController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FmcReportingStatisticController],
      providers: [FmcReportingStatisticService],
    }).compile();

    fmcReportingStatisticController = app.get<FmcReportingStatisticController>(
      FmcReportingStatisticController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fmcReportingStatisticController.getHello()).toBe('Hello World!');
    });
  });
});
