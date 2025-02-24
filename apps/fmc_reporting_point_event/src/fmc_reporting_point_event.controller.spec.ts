import { Test, TestingModule } from '@nestjs/testing';
import { FmcReportingPointEventController } from './fmc_reporting_point_event.controller';
import { FmcReportingPointEventService } from './fmc_reporting_point_event.service';

describe('FmcReportingPointEventController', () => {
  let fmcReportingPointEventController: FmcReportingPointEventController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FmcReportingPointEventController],
      providers: [FmcReportingPointEventService],
    }).compile();

    fmcReportingPointEventController = app.get<FmcReportingPointEventController>(FmcReportingPointEventController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fmcReportingPointEventController.getHello()).toBe('Hello World!');
    });
  });
});
