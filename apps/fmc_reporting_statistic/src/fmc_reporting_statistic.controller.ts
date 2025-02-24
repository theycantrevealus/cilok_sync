import { Controller, Get } from '@nestjs/common';

import { FmcReportingStatisticService } from './fmc_reporting_statistic.service';

@Controller()
export class FmcReportingStatisticController {
  constructor(
    private readonly fmcReportingStatisticService: FmcReportingStatisticService,
  ) {}

  @Get()
  getHello(): string {
    return this.fmcReportingStatisticService.getHello();
  }
}
