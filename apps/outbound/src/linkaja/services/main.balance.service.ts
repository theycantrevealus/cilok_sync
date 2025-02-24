import { Injectable } from '@nestjs/common';

import { DisbursementCheckDTO } from '../dtos/disbursement.check.dto';
import { DisbursementInquiryDTO } from '../dtos/disbursement.inquiry.dto';
import { LinkAjaDisbursementDTOResponse } from '../dtos/get.token.dto';
import { MainBalanceIntegration } from '../integration/main.balance.integration';

@Injectable()
export class MainBalanceService {
  constructor(private integration: MainBalanceIntegration) {}

  async getToken(body): Promise<LinkAjaDisbursementDTOResponse> {
    return await this.integration.getToken(body);
  }

  async disbursement(payload: DisbursementInquiryDTO): Promise<any> {
    try {
      const res = await this.integration.postDisbursement(payload);
      return res;
    } catch (error) {
      throw new Error(error);
    }
  }

  async disbursementCheck(
    payload: DisbursementCheckDTO,
  ): Promise<LinkAjaDisbursementDTOResponse> {
    return await this.integration.post(payload, '/disbursement/check');
  }
}
