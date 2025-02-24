import { Injectable } from '@nestjs/common';

import { SetConfigDTOResponse } from '@/application/dto/set.config.dto';
import {
  AdjustCustomerPointDTO,
  AdjustCustomerPointDTOResponse,
} from '@/linkaja/dtos/adjust.customer.point.dto';
import { DisbursementCheckDTO } from '@/linkaja/dtos/disbursement.check.dto';
import { DisbursementConfirmDTO } from '@/linkaja/dtos/disbursement.confirm.dto';
import { DisbursementInquiryDTO } from '@/linkaja/dtos/disbursement.inquiry.dto';
import { AdjustCustomerPointIntegration } from '@/linkaja/integration/adjust.customer.point.integration';
import { MainBalanceIntegration } from '@/linkaja/integration/main.balance.integration';

@Injectable()
export class AdjustCustomerPointService {
  constructor(private integration: AdjustCustomerPointIntegration) {}

  async adjustCustomerPointBalance(
    payload: AdjustCustomerPointDTO,
  ): Promise<AdjustCustomerPointDTOResponse> {
    return await this.integration.post(payload, 'poin/v1/submit');
  }
}
