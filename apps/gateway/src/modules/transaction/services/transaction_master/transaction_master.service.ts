import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransactionMaster, TransactionMasterDocument } from '@transaction_master/models/transaction_master.model';

@Injectable()
export class TransactionMasterService {
  constructor(
    @InjectModel(TransactionMaster.name) private transactionMasterModel: Model<TransactionMasterDocument>,
  ) {}

   /**
   * find one data from transaction master 
   */
   async getTransactionMasterFindOne(obj:any) {
    return await this.transactionMasterModel.findOne(obj);
  }
  
}
