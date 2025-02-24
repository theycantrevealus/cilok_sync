import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';


import { SLCluster } from '@/application/cluster/cluster';

import { HttpExceptionsFilter } from './filters/http-exception.filter';
import { TelegramModule } from './telegram.module';

async function bootstrap() {
  const app = await NestFactory.create(TelegramModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  // Set Route Prefix
  app.setGlobalPrefix('api', { exclude: [''] });

  // Pipes
  app.useGlobalPipes(new ValidationPipe());

  // Filters
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpExceptionsFilter(httpAdapter, app.get(Logger)));

  await app.listen(configService.get<number>('TELEGRAM_APP_PORT'));
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
