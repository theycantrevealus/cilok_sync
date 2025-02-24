import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { version } from '../../../package.json';

@Injectable()
export class TelegramService {
  constructor(private configService: ConfigService) {}

  getAppInformation(): {
    version: string;
    name: string;
    description: string;
  } {
    return {
      version: version,
      name: this.configService.get<string>('TELEGRAM_APP_NAME'),
      description: this.configService.get<string>('TELEGRAM_APP_DESCRIPTION'),
    };
  }
}
