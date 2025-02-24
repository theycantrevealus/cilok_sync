import { NestFactory } from '@nestjs/core';

import { SlconfigModule } from './slconfig.module';

async function bootstrap() {
  const app = await NestFactory.create(SlconfigModule);
  await app.listen(3009);
}
bootstrap();
