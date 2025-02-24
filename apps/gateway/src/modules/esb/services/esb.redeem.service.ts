import { Injectable } from '@nestjs/common';

import {
  EsbRedeemCallbackRequestPayloadDTO,
  EsbRedeemCallbackResponseDTO,
} from '../dtos/esb.redeem.callback.dto';
import { EsbRedeemIntegration } from '../integration/esb.redeem.integration';

@Injectable()
export class EsbRedeemService {
  private integration: EsbRedeemIntegration;
  constructor(integration: EsbRedeemIntegration) {
    this.integration = integration;
  }

  async callback(
    payload: EsbRedeemCallbackRequestPayloadDTO,
  ): Promise<EsbRedeemCallbackResponseDTO> {
    return await this.integration.callback(payload);
  }
}
