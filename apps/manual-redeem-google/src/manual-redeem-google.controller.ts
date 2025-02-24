import { Controller, Get } from '@nestjs/common';
import { ManualRedeemGoogleService } from './manual-redeem-google.service';
import {MessagePattern, Payload} from "@nestjs/microservices";

@Controller()
export class ManualRedeemGoogleController {
  constructor(private readonly manualRedeemGoogleService: ManualRedeemGoogleService) {}

  /**
   * Consume topic manual_redeem_google
   * @param payload
   */
  @MessagePattern('manual-redeem-google')
  async manualRedeem(@Payload() payload: any) {
    return await this.manualRedeemGoogleService.processRedeem(payload);
  }

}
