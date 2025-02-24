import { Controller, Get } from '@nestjs/common';
import { ConnectionTestService } from './connection_test.service';

@Controller()
export class ConnectionTestController {
  constructor(private readonly connectionTestService: ConnectionTestService) {}

  @Get()
  getHello(): string {
    return this.connectionTestService.getHello();
  }
}
