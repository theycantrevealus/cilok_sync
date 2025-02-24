import { NestFactory } from '@nestjs/core';

import { SlRedisModule } from './slredis.module';

async function bootstrap() {
  const app = await NestFactory.create(SlRedisModule);
  await app.listen(3010);
}
bootstrap();
