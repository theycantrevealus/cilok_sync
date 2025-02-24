import { Test, TestingModule } from '@nestjs/testing';
import { ReportingPointEventController } from './reporting_point_event.controller';
import { ReportingPointEventService } from './reporting_point_event.service';

describe('ReportingPointEventController', () => {
  let reportingPointEventController: ReportingPointEventController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReportingPointEventController],
      providers: [ReportingPointEventService],
    }).compile();

    reportingPointEventController = app.get<ReportingPointEventController>(ReportingPointEventController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(reportingPointEventController.getHello()).toBe('Hello World!');
    });
  });
});
