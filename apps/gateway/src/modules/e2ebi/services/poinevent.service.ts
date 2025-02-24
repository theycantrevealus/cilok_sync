import {Injectable} from "@nestjs/common";
import {PoineventAddDTO} from "@/e2ebi/dtos/poinevent.dto";
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto";
import {PoineventIntegration} from "@/e2ebi/integration/poinevent.integration";

@Injectable()
export class PoineventService {
  constructor(
    private integration: PoineventIntegration,
  ) {}

  async post(payload: PoineventAddDTO): Promise<SetConfigDTOResponse> {
    return await this.integration.post(payload);
  }
}
