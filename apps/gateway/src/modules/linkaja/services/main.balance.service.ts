import {Injectable} from "@nestjs/common"
import {MainBalanceIntegration} from "@/linkaja/integration/main.balance.integration"
import {DisbursementInquiryDTO} from "@/linkaja/dtos/disbursement.inquiry.dto";
import {DisbursementConfirmDTO} from "@/linkaja/dtos/disbursement.confirm.dto";
import {DisbursementCheckDTO} from "@/linkaja/dtos/disbursement.check.dto";
import {AdjustCustomerPointDTO} from "@/linkaja/dtos/adjust.customer.point.dto";
import {LinkAjaDisbursementDTOResponse} from "@/linkaja/dtos/get.token.dto";

@Injectable()
export class MainBalanceService {
  constructor(
    private integration: MainBalanceIntegration
  ) {
  }

  async getToken(body):
    Promise<LinkAjaDisbursementDTOResponse> {
    return await this.integration.getToken(body)
  }
  async disbursement(payload: DisbursementInquiryDTO
  ):
    Promise<LinkAjaDisbursementDTOResponse> {
    return await this.integration.postDisbursement(payload)
  }

  async disbursementCheck(payload: DisbursementCheckDTO
  ):
    Promise<LinkAjaDisbursementDTOResponse> {
    return await this.integration.post(payload, '/disbursement/check')
  }

}
