import { Module } from '@nestjs/common';
import { FmcReportingPointEventController } from './fmc_reporting_point_event.controller';
import { FmcReportingPointEventService } from './fmc_reporting_point_event.service';

@Module({
  imports: [],
  controllers: [FmcReportingPointEventController],
  providers: [FmcReportingPointEventService],
})
export class FmcReportingPointEventModule {}
