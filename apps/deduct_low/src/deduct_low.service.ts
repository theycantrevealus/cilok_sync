import { Injectable } from '@nestjs/common';

@Injectable()
export class DeductLowService {
  getHello(): string {
    return 'Hello World!';
  }
}
