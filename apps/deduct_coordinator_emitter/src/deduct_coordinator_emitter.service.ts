import { Injectable } from '@nestjs/common';

@Injectable()
export class DeductCoordinatorEmitterService {
  getHello(): string {
    return 'Hello World!';
  }
}
