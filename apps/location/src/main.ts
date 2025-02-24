import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as fs from 'fs';

import { ApplicationModule } from '@/application/application.module';

import { LocationModule } from './location.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    ApplicationModule,
  );
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    LocationModule,
    await KafkaConn.location[0].useFactory(configService),
  );
  app.listen();
  console.log('SIGNAL_DONE');
}
bootstrap();
