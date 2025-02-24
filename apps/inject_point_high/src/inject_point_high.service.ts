import { Injectable } from '@nestjs/common';

@Injectable()
export class InjectPointHighService {
  getHello(): string {
    return 'Hello World!';
  }
}
