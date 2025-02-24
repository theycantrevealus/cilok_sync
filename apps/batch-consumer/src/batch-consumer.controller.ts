import { Controller, Get } from '@nestjs/common';
import { BatchConsumerService } from './batch-consumer.service';
import {MessagePattern, Payload} from "@nestjs/microservices";

@Controller()
export class BatchConsumerController {
  constructor(private readonly batchConsumerService: BatchConsumerService) {}

  @MessagePattern('batch-queue')
  async process(@Payload() payload: any) {
    return await this.batchConsumerService.batchProcess(payload);
  }
}
