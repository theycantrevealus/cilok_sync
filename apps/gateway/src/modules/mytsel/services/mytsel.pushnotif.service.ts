import { Injectable } from '@nestjs/common';

import { MyTselPushNotifDto } from '../dtos/mytsel.pushnotif.dto';
import { MyTselResponseInboxPushNotif } from '../dtos/mytsel.response.inbox.pushnotif';
import { MyTselPushNotifIntegration } from '../integration/mytsel.pushnotif.integration';

@Injectable()
export class MyTselPushNotifService {
  private integration: MyTselPushNotifIntegration;
  constructor(integration: MyTselPushNotifIntegration) {
    this.integration = integration;
  }

  async post(
    payload: MyTselPushNotifDto,
  ): Promise<MyTselResponseInboxPushNotif> {
    return await this.integration.post(payload);
  }
}
