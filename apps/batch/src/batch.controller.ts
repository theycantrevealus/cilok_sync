import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { BatchService } from './batch.service';
import {
  BatchMessageDto,
  StoreDataRowPayload,
} from './models/batch-message.dto';

@Controller()
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get()
  getHello(): string {
    return this.batchService.getHello();
  }

  @MessagePattern('batch_process')
  async injectCoupon(@Payload() payload: BatchMessageDto) {
    await this.batchService.batch_process(payload);
    return true;
  }

  // @MessagePattern('store_data_row')
  // async storeDataRow(@Payload() payload: StoreDataRowPayload) {
  //   await this.batchService.store_data(
  //     payload.payload,
  //     payload.data,
  //     payload.id_process,
  //   );
  //   return true;
  // }
}
