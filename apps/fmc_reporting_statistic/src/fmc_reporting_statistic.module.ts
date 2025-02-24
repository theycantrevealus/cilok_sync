import { Module } from '@nestjs/common';

import { FmcReportingStatisticController } from './fmc_reporting_statistic.controller';
import { FmcReportingStatisticService } from './fmc_reporting_statistic.service';

@Module({
  imports: [],
  controllers: [FmcReportingStatisticController],
  providers: [FmcReportingStatisticService],
})
export class FmcReportingStatisticModule {}
