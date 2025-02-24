import { Injectable } from '@nestjs/common';

@Injectable()
export class DeductCoordinatorService {
  getHello(): string {
    return 'Hello World!';
  }
}
