import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { BatchStoreDataService } from './batch-store-data.service';
import {
  StoreDataRowPayload,
} from './models/batch-message.dto';

@Controller()
export class BatchController {
  constructor(private readonly batchService: BatchStoreDataService) {}

  @Get()
  getHello(): string {
    return this.batchService.getHello();
  }

  @MessagePattern('store_data_row')
  async storeDataRow(@Payload() payload: StoreDataRowPayload) {
    await this.batchService.store_data(
      payload.payload,
      payload.data,
      payload.id_process,
    );
    return true;
  }
}
