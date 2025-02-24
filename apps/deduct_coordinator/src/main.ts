import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { SlconfigModule } from '@slconfig/slconfig.module';

import { DeductCoordinatorModule } from './deduct_coordinator.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice(DeductCoordinatorModule, {
    name: '',
    transport: Transport.REDIS,
    options: {
      host: configService.get<string>('redis.host'),
      port: +configService.get<number>('redis.port'),
      password: configService.get<string>('redis.password'),
    },
  });

  app.listen().then(() => {
    console.log('SIGNAL_DONE');
  });
}
bootstrap();
