import { Controller, Get, Logger, Req } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { InjectPointService } from './inject.point.service';

@Controller()
export class InjectPointController {
  constructor(private readonly injectPointService: InjectPointService) {}

  @MessagePattern('inject_point')
  injectPoint(payload: any, @Req() request): any {
    return this.injectPointService
      .process(payload, 'request.clientIp')
      .then((res) => {
        if (res.code == 200) Logger.log('SUCCESS', res);
        else Logger.log('NOT PROCESS', res);
      })
      .catch((e) => Logger.log('ERROR/CATCH', e));
  }
}
