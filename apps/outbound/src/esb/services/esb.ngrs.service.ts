import { Injectable } from '@nestjs/common';

import { NgrsDTOResponse } from '../dtos/esb.order.dto';
import { NgrsRechargeDto } from '../dtos/ngrs.recharge.dto';
import { EsbNgrsIntegration } from '../integration/esb.ngrs.recharge.integration';

@Injectable()
export class EsbNgrsService {
  private integration: EsbNgrsIntegration;
  constructor(integration: EsbNgrsIntegration) {
    this.integration = integration;
  }

  async post(payload: NgrsRechargeDto): Promise<NgrsDTOResponse> {
    try {
      return await this.integration.post(payload);
    } catch (error) {
      throw new Error(error);
    }
  }
}
