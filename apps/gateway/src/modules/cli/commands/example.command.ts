import { ConsoleLogger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

import { ApplicationService } from '@/application/services/application.service';

type CommandOptions = {
  id?: number;
};

@Command({
  name: 'sample1',
  options: { isDefault: true },
})
export class Sample1Command extends CommandRunner {
  constructor(
    private readonly appService: ApplicationService,
    private readonly logger: ConsoleLogger,
  ) {
    super();
  }

  @Option({
    flags: '--id [number]',
  })
  parseId(value: string): number {
    return Number(value);
  }

  async run(passedParams: string[], options?: CommandOptions): Promise<void> {
    const txt = await this.appService.getHello();
  }
}
