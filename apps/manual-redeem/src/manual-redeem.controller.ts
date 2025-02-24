import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ManualRedeemService } from './manual-redeem.service';

@Controller()
export class ManualRedeemController {
  constructor(private readonly manualRedeemService: ManualRedeemService) {}

  /**
   * Consume topic manual_redeem_
   * @param payload
   */
  @MessagePattern('manual-redeem')
  async manualRedeem(@Payload() payload: any) {
    return await this.manualRedeemService.processRedeem(payload);
  }
}
