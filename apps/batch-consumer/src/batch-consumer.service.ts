import { Injectable } from '@nestjs/common';

@Injectable()
export class BatchConsumerService {

  constructor() {
  }

  /**
   * Route process function by destination
   * @param payload
   */
  async batchProcess(payload: any) {
    // service call by destination
    switch(payload.destination) {
      case 'batch-redeem':
        await this.batchRedeem(payload);
        break;

      case 'batch-coupon':
        await this.batchCoupon(payload);
        break;

      case 'batch-poin':
        await this.batchPoin(payload);
        break;
    }
  }

  /**
   * For process batch redeem
   * @param payload
   */
  async batchRedeem(payload: any) {
    console.log(`Do batch redeem...`);
  }

  /**
   * For process batch coupon
   * @param payload
   */
  async batchCoupon(payload: any) {
    console.log(`Do batch coupon...`);
  }

  /**
   * For process batch poin
   * @param payload
   */
  async batchPoin(payload: any) {
    console.log(`Do batch poin...`);
  }
}
