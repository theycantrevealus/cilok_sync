import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class MigrationService {
  constructor(
    @InjectQueue('migration')
    protected readonly migQueue: Queue,
  ) {
    //
  }
  async import_dci(filePath: string, token: any) {
    return this.migQueue
      .add(
        'migration-dci',
        { path: filePath, token: token },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
