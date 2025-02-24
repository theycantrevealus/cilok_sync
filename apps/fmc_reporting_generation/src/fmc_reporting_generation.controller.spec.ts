import { Test, TestingModule } from '@nestjs/testing';
import { FmcReportingGenerationController } from './fmc_reporting_generation.controller';
import { FmcReportingGenerationService } from './fmc_reporting_generation.service';

describe('FmcReportingGenerationController', () => {
  let fmcReportingGenerationController: FmcReportingGenerationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [FmcReportingGenerationController],
      providers: [FmcReportingGenerationService],
    }).compile();

    fmcReportingGenerationController = app.get<FmcReportingGenerationController>(FmcReportingGenerationController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(fmcReportingGenerationController.getHello()).toBe('Hello World!');
    });
  });
});
