import { Injectable } from '@nestjs/common';

import {
  EsbNotificationDTO,
  EsbNotificationDTOResponse,
} from '../dtos/esb.notification.dto';
import { EsbNotificationIntegration } from '../integration/esb.notification.integration';
@Injectable()
export class EsbNotificationService {
  private integration: EsbNotificationIntegration;
  constructor(integration: EsbNotificationIntegration) {
    this.integration = integration;
  }

  async post(payload: EsbNotificationDTO): Promise<EsbNotificationDTOResponse> {
    return await this.integration.post(payload);
  }
}
