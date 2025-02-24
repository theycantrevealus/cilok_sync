import { Module } from '@nestjs/common';

import { ProvPrepaidController } from './prov_prepaid.controller';
import { ProvPrepaidService } from './prov_prepaid.service';

@Module({
  imports: [],
  controllers: [ProvPrepaidController],
  providers: [ProvPrepaidService],
})
export class ProvPrepaidModule {}
