import { Injectable } from '@nestjs/common';

@Injectable()
export class DeductHighService {
  getHello(): string {
    return 'Hello World!';
  }
}
