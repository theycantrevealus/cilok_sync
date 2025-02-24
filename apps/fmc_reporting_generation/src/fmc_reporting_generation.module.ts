import { Module } from '@nestjs/common';

import { FmcReportingGenerationController } from './fmc_reporting_generation.controller';
import { FmcReportingGenerationService } from './fmc_reporting_generation.service';

@Module({
  imports: [],
  controllers: [FmcReportingGenerationController],
  providers: [FmcReportingGenerationService],
})
export class FmcReportingGenerationModule {}
