import { Controller, Get } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { KafkaVoteService } from './vote.service';

@Controller()
export class VoteController {
  constructor(private readonly voteService: KafkaVoteService) {}

  @EventPattern(process.env.KAFKA_VOTE_TOPIC)
  async donation(@Payload() payload: any): Promise<void> {
    await this.voteService.process_vote(payload);
  }
}
