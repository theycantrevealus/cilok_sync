import { Test, TestingModule } from '@nestjs/testing';

import { VoteController } from './vote.controller';
import { KafkaVoteService } from './vote.service';

describe('VoteController', () => {
  let voteController: VoteController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VoteController],
      providers: [KafkaVoteService],
    }).compile();

    voteController = app.get<VoteController>(VoteController);
  });
});
