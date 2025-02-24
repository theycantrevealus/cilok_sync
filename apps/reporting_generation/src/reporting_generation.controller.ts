import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ReportingGenerationService } from './reporting_generation.service';

@Controller()
export class ReportingGenerationController {
  constructor(
    @Inject(ReportingGenerationService)
    private readonly reportingGenerationService: ReportingGenerationService,
  ) {}

  /**
   * REPORTING GENERATION
   */
  @MessagePattern(process.env.KAFKA_REPORTING_GENERATION_TOPIC)
  async reportGenerationRouting(@Payload() payload: any) {
    await this.reportingGenerationService.reportGenerationRouting(payload);
  }

  /**
   * @param payload : {
   *    "service_name": ['REWARD_LIVE_SYSTEM', 'POIN_OWNER_FROM_CORE'],
   *    "origin": "cron",
   *    "start_period": "2023-01-01",
   *    "end_period": "2023-01-31"
   * }
   */
  @MessagePattern(process.env.KAFKA_REPORTING_GENERATION_RECOVERY_TOPIC)
  async reportGenerationRecoveryRouting(@Payload() payload: any) {
    await this.reportingGenerationService.reportGenerationRecoveryRouting(
      payload,
    );
  }
}
