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
    try {
      const data = await this.integration.post(payload);
      return data;
    } catch (error) {
      throw new Error(error);
    }
  }
}
