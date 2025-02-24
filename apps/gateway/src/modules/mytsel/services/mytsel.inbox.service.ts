import { Injectable } from '@nestjs/common';

import { MyTselInboxDto } from '../dtos/mytsel.inbox.dto';
import { MyTselResponseInboxPushNotif } from '../dtos/mytsel.response.inbox.pushnotif';
import { MyTselInboxIntegration } from '../integration/mytsel.inbox.integration';

@Injectable()
export class MyTselInboxService {
  private integration: MyTselInboxIntegration;
  constructor(integration: MyTselInboxIntegration) {
    this.integration = integration;
  }

  async post(payload: MyTselInboxDto): Promise<MyTselResponseInboxPushNotif> {
    return await this.integration.post(payload);
  }
}
