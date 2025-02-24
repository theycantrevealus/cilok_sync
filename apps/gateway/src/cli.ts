import { WinstonCustomTransport } from '@utils/logger/transport';
import { CommandFactory } from 'nest-commander';
import winston from 'winston';

import { CLIModule } from '@/cli/cli.module';

async function bootstrap() {
  const targetEnv: string =
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === '' ||
    process.env.NODE_ENV === 'development'
      ? 'development'
      : process.env.NODE_ENV;

  await CommandFactory.run(CLIModule, [
    'verbose',
    'warn',
    'error',
    'debug',
    'log',
  ]);
}

bootstrap();
