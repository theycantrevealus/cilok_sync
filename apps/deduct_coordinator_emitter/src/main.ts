import { NestFactory } from '@nestjs/core';

import { DeductCoordinatorEmitterModule } from './deduct_coordinator_emitter.module';

async function bootstrap() {
  const app = await NestFactory.create(DeductCoordinatorEmitterModule);
  await app.listen(3002).then(() => {
    console.log('SIGNAL_DONE');
  });
}
bootstrap();
