import { Controller } from '@nestjs/common';

import { SlRedisService } from './slredis.service';

@Controller()
export class SlRedisController {
  constructor(private readonly slRedisService: SlRedisService) {}
}
