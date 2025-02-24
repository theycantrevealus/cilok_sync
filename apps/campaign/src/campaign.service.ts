import { Injectable } from '@nestjs/common';

@Injectable()
export class CampaignService {
  getHello(): string {
    return 'Hello World!';
  }
}
