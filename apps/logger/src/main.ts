import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { LoggerModule } from './logger.module';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    logger: false,
    ignoreDuplicateSlashes: true,
    ignoreTrailingSlash: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    LoggerModule,
    fastifyAdapter,
  );

  app.enableCors();

  await app.listen(3259);
}
bootstrap();
