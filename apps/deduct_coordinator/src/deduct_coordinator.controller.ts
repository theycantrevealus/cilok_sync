import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RedisContext } from '@nestjs/microservices';
import { Ctx } from 'nestjs-telegraf';

import { DeductCoordinatorService } from './deduct_coordinator.service';

@Controller()
export class DeductCoordinatorController {
  constructor(
    private readonly deductCoordinatorService: DeductCoordinatorService,
  ) {}

  @MessagePattern('deduct_coordinator')
  getNotifications(@Payload() data: number[]) {
    console.log(JSON.stringify(data, null, 2));

    // Ini akan dikirim k consumer sebagai hasil proses
    return { ack: 1 };
  }
}
