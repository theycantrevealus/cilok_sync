import { Controller } from '@nestjs/common';
import { ManualProcessService } from './manual-process.service';
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ProcessDataRowPayload } from "./models/manual-process.dto";

@Controller()
export class ManualProcessController {
  constructor(private readonly manualProcessService: ManualProcessService) {}

  //@MessagePattern('manual_process')
  //async processDataRow(@Payload() payload: any) {
  //  await this.manualProcessService.processDataRow();
  //}

  @MessagePattern('manual_redeem_transfer_pulsa')
  async transferPulsa(@Payload() payload: ProcessDataRowPayload) {
    await this.manualProcessService.transferPulsa(payload);
  }

  @MessagePattern('manual_redeem_google_trx')
  async googleTransaction(@Payload() payload: ProcessDataRowPayload) {
    await this.manualProcessService.googleTransaction(payload);
  }
}
