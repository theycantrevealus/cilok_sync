import { Injectable } from '@nestjs/common';

import {
  AdjustCustomerPointDTO,
  AdjustLinkAjaDTOResponse,
} from '../dtos/adjust.customer.point.dto';
import { AdjustCustomerPointIntegration } from '../integration/adjust.customer.point.integration';

@Injectable()
export class AdjustCustomerPointService {
  constructor(private integration: AdjustCustomerPointIntegration) {}

  async adjustCustomerPointBalance(
    payload: AdjustCustomerPointDTO,
  ): Promise<AdjustLinkAjaDTOResponse> {
    try {
      const data = await this.integration.post(payload, 'poin/v1/submit');
      return data;
    } catch (error) {
      throw new Error(error);
    }
  }
}
