import { Controller, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';

import { MerchandiseService } from './merchandise.service';

@Controller()
export class MerchandiseController {
  constructor(
    private readonly merchandiseService: MerchandiseService,
  ) {}

  @MessagePattern('merchandise')
  eligibilityCheck(@Payload() payload: any): any {
    return this.merchandiseService.processRedeemMerchandiseV2(payload);
  }
}
