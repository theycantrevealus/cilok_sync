import { Controller, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';

import { CronService } from './cron.service';

@Controller()
export class CronController {
  constructor(
    private readonly cronService: CronService,

    @Inject('CRON_SERVICE_PRODUCER')
    private readonly clientCron: ClientKafka,
  ) {}

  /**
   * Payload format example:
   * {
   *  type: 'SERVICE',      -> checking params for update
   *  name: 'EXAMPLE_NAME,  -> checking params for update
   *  description: '',
   *  interval: '* * * * * *',
   *  target_topic: 'example_topic',
   *  payload : {
   *    //all of parameters service need
   *  },
   *  is_running: true,
   *  need_restart: false,
   *  pending_for: ObjectId('63da076aca24275f58ca7728')  -> for chaining process
   * }
   * @param payload
   */
  @MessagePattern('cron')
  async setCron(payload: any) {
    return await this.cronService.setupCron(payload);
  }
}
