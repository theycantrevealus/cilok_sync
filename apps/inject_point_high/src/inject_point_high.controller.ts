import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectService } from '@inject_point/inject.point.kafka.service';

@Controller()
export class InjectPointHighController {
  constructor(
    private readonly injectService: InjectService,
  ) {}

  @MessagePattern(process.env.KAFKA_INJECT_POINT_HIGH_TOPIC)
  async validation(@Payload() payload: any) {
    const data = await this.injectService.validation(payload);
  
    // Nullify
    payload = null;

    return data;
  }
}
