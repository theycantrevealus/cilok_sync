import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { DataSyncService } from './data-sync.service';

@Controller()
export class DataSyncController {
  constructor(private readonly dataSyncService: DataSyncService) {}

  @MessagePattern('data_sync')
  async actDataSync(@Payload() payload: any) {
    return await this.dataSyncService.actDataSync(payload);
  }
}
