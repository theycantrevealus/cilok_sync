import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { LocationService } from './location.service';

@Controller()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @MessagePattern('location')
  async importLocation(payload: any) {
    if (payload) {
      return await this.locationService.import_location(
        payload.data_source,payload.file,payload.credential
      )
    } else {
      throw new Error('No file found');
    }
  }
}
