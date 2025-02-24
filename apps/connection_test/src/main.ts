import { NestFactory } from '@nestjs/core';
import { ConnectionTestModule } from './connection_test.module';

async function bootstrap() {
  const app = await NestFactory.create(ConnectionTestModule);
  await app.listen(3000);
}
bootstrap();
