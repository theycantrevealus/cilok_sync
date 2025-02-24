import { VoucherUpdate, VoucherUpdateDocument } from '@/transaction/models/voucher/voucher.update.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class VoucherUpdateService {
  constructor(
    @InjectModel(VoucherUpdate.name) private readonly voucherUpdateModel: Model<VoucherUpdateDocument>,
  ) {}

  /**
   * Saves VoucherUpdate log data to the database.
   * @param voucherUpdateData - The log data to be saved.
   * @returns Promise<VoucherUpdate> - A Promise containing the saved VoucherUpdate data.
   */
  async createVoucherUpdateLog(voucherUpdateData: Partial<VoucherUpdate>): Promise<VoucherUpdate> {
    const voucherUpdate = new this.voucherUpdateModel(voucherUpdateData);
    return await voucherUpdate.save();
  }
}
