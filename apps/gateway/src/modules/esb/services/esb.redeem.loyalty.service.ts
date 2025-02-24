import { Injectable } from '@nestjs/common';

import { EsbRedeemLoyaltyCallbackDto } from '../dtos/esb.redeem.loyalty.callback.dto';
import { EsbRedeemLoyaltyCallbackResponseDto } from '../dtos/esb.redeem.loyalty.callback.response.dto';
import { EsbRedeemLoyaltyIntegration } from '../integration/esb.redeem.loyalty.integration';

@Injectable()
export class EsbRedeemLoyaltyService {
  private integration: EsbRedeemLoyaltyIntegration;
  constructor(integration: EsbRedeemLoyaltyIntegration) {
    this.integration = integration;
  }

  async callback(
    payload: EsbRedeemLoyaltyCallbackDto,
    customURLESB: string = '',
  ): Promise<EsbRedeemLoyaltyCallbackResponseDto> {
    console.log(`Payload to send ESB =>> ${JSON.stringify(payload, null, 2)}`);
    return await this.integration.callback(payload, customURLESB);
  }
}
