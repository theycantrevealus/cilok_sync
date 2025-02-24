import { Controller, Get } from '@nestjs/common';
import { FmcReportingPointEventService } from './fmc_reporting_point_event.service';

@Controller()
export class FmcReportingPointEventController {
  constructor(private readonly fmcReportingPointEventService: FmcReportingPointEventService) {}

  @Get()
  getHello(): string {
    return this.fmcReportingPointEventService.getHello();
  }
}
