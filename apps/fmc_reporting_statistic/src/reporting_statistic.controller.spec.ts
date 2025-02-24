import { Test, TestingModule } from '@nestjs/testing';

import { ReportingStatisticController } from './reporting_statistic.controller';
import { ReportingStatisticService } from './reporting_statistic.service';

describe('ReportingController', () => {
  let reportingController: ReportingStatisticController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReportingStatisticController],
      providers: [ReportingStatisticService],
    }).compile();

    reportingController = app.get<ReportingStatisticController>(
      ReportingStatisticController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(reportingController.getHello()).toBe('Hello World!');
    });
  });
});
