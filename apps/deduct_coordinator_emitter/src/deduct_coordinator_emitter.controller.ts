import { Controller, Get, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

import { DeductCoordinatorEmitterService } from './deduct_coordinator_emitter.service';

@Controller()
export class DeductCoordinatorEmitterController {
  client: ClientProxy;
  constructor(
    private readonly deductCoordinatorEmitterService: DeductCoordinatorEmitterService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: configService.get<string>('redis.host'),
        port: +configService.get<number>('redis.port'),
        password: configService.get<string>('redis.password'),
      },
    });
  }

  @Get()
  getHello(): string {
    return this.deductCoordinatorEmitterService.getHello();
  }

  @Post()
  async emitDeductProcess() {
    // Hasil proses akan diterima disini
    return await this.client.send('deduct_coordinator', {
      msisdn: '6285261510202',
      book: 1,
    });
  }
}
