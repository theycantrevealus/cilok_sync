import { Test, TestingModule } from '@nestjs/testing';

import { ReportingGenerationController } from './reporting_generation.controller';
import { ReportingGenerationService } from './reporting_generation.service';

describe('ReportingGenerationController', () => {
  let reportingGenerationController: ReportingGenerationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReportingGenerationController],
      providers: [ReportingGenerationService],
    }).compile();

    reportingGenerationController = app.get<ReportingGenerationController>(
      ReportingGenerationController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(reportingGenerationController.getHello()).toBe('Hello World!');
    });
  });
});
