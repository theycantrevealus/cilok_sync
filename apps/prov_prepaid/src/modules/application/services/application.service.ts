import { Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationService {
  constructor() {
    //
  }

  async getHello() {
    return 'hello service';
  }
}
