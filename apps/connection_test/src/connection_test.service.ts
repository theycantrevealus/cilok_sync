import { Injectable } from '@nestjs/common';

@Injectable()
export class ConnectionTestService {
  getHello(): string {
    return 'Hello World!';
  }
}
