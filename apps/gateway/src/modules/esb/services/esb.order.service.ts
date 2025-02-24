import { Injectable } from '@nestjs/common';

import { EsbOrderDTO, EsbOrderDTOResponse } from '../dtos/esb.order.dto';
import { EsbOrderIntegration } from '../integration/esb.order.integration';

@Injectable()
export class EsbOrderService {
  private integration: EsbOrderIntegration;
  constructor(integration: EsbOrderIntegration) {
    this.integration = integration;
  }

  async post(payload: EsbOrderDTO): Promise<EsbOrderDTOResponse> {
    return await this.integration.post(payload);
  }
}
