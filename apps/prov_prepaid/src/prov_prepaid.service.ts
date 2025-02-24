import { Injectable } from '@nestjs/common';

@Injectable()
export class ProvPrepaidService {
  getHello(): string {
    return 'Hello World!';
  }
}
