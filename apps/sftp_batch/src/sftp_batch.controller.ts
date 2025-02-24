import { Controller, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { SftpService } from '@sftp/sftp.service';

@Controller()
export class SftpBatchController {
  constructor(
    @Inject(SftpService)
    private readonly sftpKafkaService: SftpService,
  ) {}

  /**
   * For consume topic sftp read file for batch process
   * @param payload
   */
  @MessagePattern('sftp-incoming-batch-process')
  async sftpIncomingBatchProcess(@Payload() payload: any) {
    console.log('INI FN BARU');
    return this.sftpKafkaService.sftpIncomingBatchProcess(payload);
  }
}
