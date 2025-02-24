import { Controller, Get } from '@nestjs/common';
import { FmcReportingGenerationService } from './fmc_reporting_generation.service';

@Controller()
export class FmcReportingGenerationController {
  constructor(private readonly fmcReportingGenerationService: FmcReportingGenerationService) {}

  @Get()
  getHello(): string {
    return this.fmcReportingGenerationService.getHello();
  }
}
