import { Body, Controller, Post, Req, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DataSyncDTO } from '../dto/data_sync.dto';
import { DataSyncService } from '../services/data_sync.service';

@Controller('data_sync')
@ApiTags('Data Synchronization')
export class DataSyncController {
  private dataSyncService: DataSyncService;

  constructor(dataSyncService: DataSyncService) {
    this.dataSyncService = dataSyncService;
  }

  @ApiOperation({
    summary: 'Data Sync',
    description: 'Endpoint for sync data between core and non-core',
  })
  @Version('1')
  @Post()
  async add(@Body() parameter: DataSyncDTO, @Req() request) {
    return await this.dataSyncService.push(parameter, request);
  }
}
