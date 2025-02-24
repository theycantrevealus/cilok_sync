import { Injectable } from '@nestjs/common';

import { EsbGetBalanceDTOResponse } from '@/esb/dtos/esb.getbalance.response';
import { EsbTransactionIntegration } from '@/esb/integration/esb.transaction.integration';

@Injectable()
export class EsbTransactionService {
  private integration: EsbTransactionIntegration;
  constructor(integration: EsbTransactionIntegration) {
    this.integration = integration;
  }

  async getBalance(params: any): Promise<EsbGetBalanceDTOResponse> {
    return await this.integration.getBalance(params);
  }
}
