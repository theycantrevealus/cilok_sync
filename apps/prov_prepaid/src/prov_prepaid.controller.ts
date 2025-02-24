import { Controller, Get } from '@nestjs/common';
import { ProvPrepaidService } from './prov_prepaid.service';

@Controller()
export class ProvPrepaidController {
  constructor(private readonly provPrepaidService: ProvPrepaidService) {}

  @Get()
  getHello(): string {
    return this.provPrepaidService.getHello();
  }
}
