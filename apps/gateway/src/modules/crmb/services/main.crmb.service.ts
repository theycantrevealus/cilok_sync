import {Injectable} from "@nestjs/common"
import {MainCrmbIntegration} from "@/crmb/integration/main.crmb.integration";
import {CrmbRequestBodyDto} from "@/crmb/dtos/crmb.request.body.dto";
import {CrmbResponseDTO} from "@/crmb/dtos/crmb.response.dto";

@Injectable()
export class MainCrmbService {
  constructor(
    private integration: MainCrmbIntegration
  ) {
  }

  async getTselIdBindingsGrouped(query: CrmbRequestBodyDto):
    Promise<CrmbResponseDTO> {
    return await this.integration.getTselIdBindingsGrouped(query)
  }

  async getWalletSiblingsFromCoreMember(tselId: string, token: string):
    Promise<CrmbResponseDTO> {
    return await this.integration.getWalletSiblingsFromCoreMember(tselId, token)
  }
}
