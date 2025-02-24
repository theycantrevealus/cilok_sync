import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { KafkaService } from '@deduct/kafka.service';

@Controller()
export class DeductLowController {
  constructor(
    private readonly kafkaService: KafkaService,
    ) {}

  @MessagePattern(process.env.KAFKA_DEDUCT_LOW_TOPIC)
  async validation(@Payload() payload: any) {
    const data = await this.kafkaService.deduct_validation(payload);
  
    // Nullify
    payload = null;

    return data;
  }
}
