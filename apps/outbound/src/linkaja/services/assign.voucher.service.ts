import { Injectable } from '@nestjs/common';

import {
  AssignVoucherDTO,
  AssignVoucherLinkAjaDTOResponse,
} from '../dtos/assign.voucher.dto';
import { AssignVoucherIntegration } from '../integration/assign.voucher.integration';

@Injectable()
export class AssignVoucherService {
  constructor(private integration: AssignVoucherIntegration) {}

  async assignVoucher(
    payload: AssignVoucherDTO,
  ): Promise<AssignVoucherLinkAjaDTOResponse> {
    try {
      console.log(payload, 'payload dikirim');
      const data = await this.integration.post(payload, '/v1/vouchers/assign');
      return data;
    } catch (error) {
      throw new Error(error);
    }
  }
}
