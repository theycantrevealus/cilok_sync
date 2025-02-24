import { Injectable } from '@nestjs/common';

import { EsbInboxDto, EsbInboxDtoResponse } from '../dtos/esb.inbox.dto';
import { EsbInboxIntegration } from '../integration/esb.inbox.integration';

@Injectable()
export class EsbInboxService {
  private integration: EsbInboxIntegration;
  constructor(integration: EsbInboxIntegration) {
    this.integration = integration;
  }

  async post(payload: EsbInboxDto): Promise<EsbInboxDtoResponse> {
    return await this.integration.post(payload);
  }
}
