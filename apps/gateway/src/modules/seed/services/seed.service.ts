import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Command } from 'nestjs-command';

import { Account, AccountDocument } from '@/account/models/account.model';

@Injectable()
export class SeedService {
  constructor(
    @InjectModel(Account.name) private lovModel: Model<AccountDocument>,
  ) {
    //
  }

  @Command({
    command: 'create:account',
    describe: 'seed data example',
  })
  async seed_account() {
    const data: Account[] = [];
  }

  @Command({
    command: 'create:location',
    describe: 'seed data location',
  })
  async seed_location() {
    //
  }
}
