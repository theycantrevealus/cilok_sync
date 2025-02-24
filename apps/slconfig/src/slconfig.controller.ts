import { Controller } from '@nestjs/common';

import { SlconfigService } from './slconfig.service';

@Controller()
export class SlconfigController {
  constructor(private readonly slconfigService: SlconfigService) {}
}
