import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApplicationService } from '../services/application.service';

@Controller({ path: 'configuration', version: '1' })
@ApiTags('Application Configuration')
export class ApplicationController {
  private appsService: ApplicationService;

  constructor(appsService: ApplicationService) {
    this.appsService = appsService;
  }
}
