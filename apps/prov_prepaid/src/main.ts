import { NestFactory } from '@nestjs/core';

import { ProvPrepaidModule } from './prov_prepaid.module';

async function bootstrap() {
  const app = await NestFactory.create(ProvPrepaidModule);
  await app.listen(3000);
}
bootstrap();
