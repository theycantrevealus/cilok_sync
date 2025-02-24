import { Controller, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';

import { SftpService } from './sftp.service';

@Controller()
export class SftpController {
  constructor(
    @Inject(SftpService)
    private readonly sftpKafkaService: SftpService,
  ) {}

  /**
   * @deprecated
   * Payload format example:
   * {
   *   request: 'setup',
   *   data: {
   *      type: 'IN',
   *      job_group: 'INJECT_POINT',  -> unique
   *      interval: '* * * * *',
   *      additional: SftpIncomingConfig || SftpOutgoingConfig,
   *      is_running: true,
   *      need_restart: false
   *   }
   * }
   * Note: request value = setup | delete | update
   * @param payload
   */
  //@MessagePattern('sftp')
  sftpSetup(@Payload() payload: any): any {
    return this.sftpKafkaService.sftp(payload);
  }

  /**
   * For consume topic sftp send
   * @param payload
   */
  @MessagePattern('sftp-outgoing')
  async sftpOutgoing(@Payload() payload: any) {
    return this.sftpKafkaService.sftpOutgoing(payload);
  }

  /**
   * For consume topic sftp read file
   * @param payload
   */
  @MessagePattern('sftp-incoming')
  async sftpIncoming(@Payload() payload: any) {
    return this.sftpKafkaService.sftpIncoming(payload);
  }

  /**
   * For consume topic sftp read file for batch process
   * @param payload
   */
  // @MessagePattern('sftp-incoming-batch-process')
  // async sftpIncomingBatchProcess(@Payload() payload: any) {
  //   return this.sftpKafkaService.sftpIncomingBatchProcess(payload);
  // }
}
