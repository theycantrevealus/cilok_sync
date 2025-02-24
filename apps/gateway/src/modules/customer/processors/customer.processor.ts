import { Process, Processor } from '@nestjs/bull';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import { Connection, Model } from 'mongoose';
import * as readline from 'readline';

import { Customer, CustomerDocument } from '../models/customer.model';
import { CustomerService } from '../services/customer.service';

@Processor('customer')
export class CustomerProcessor {
  private connection: Connection;
  private customerModel: Model<CustomerDocument>;

  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(Customer.name) customerModel: Model<CustomerDocument>,
    private customerService: CustomerService,
  ) {
    this.connection = connection;
    this.customerModel = customerModel;
  }

  @Process('customer-import')
  async handleCustomerRequest(job: Job): Promise<void> {
    const fileStream = fs.createReadStream(
      `./uploads/customer/${job.data.list.filename}`,
    );

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    const transactionSession = await this.connection.startSession();
    try {
      transactionSession.startTransaction();
      for await (const line of rl) {
        const dataSplit = line.split(',');

        let tierSet = await this.customerService.get_tier_detail({
          $eq: { name: dataSplit[5] },
        });
        if (!tierSet) {
          const genTier = await this.customerService.add_tier({
            name: dataSplit[5],
            description: `${dataSplit[5]} - Generated from import activity`,
            core_id: '',
          });
          tierSet = genTier.payload;
        }

        let brandSet = await this.customerService.get_brand_detail({
          $eq: { name: dataSplit[6] },
        });
        if (!brandSet) {
          const genBrand = await this.customerService.add_brand({
            name: dataSplit[6],
            description: `${dataSplit[6]} - Generated from import activity`,
          });
          brandSet = genBrand.payload;
        }

        const data = new this.customerModel({
          msisdn: dataSplit[0],
          activation_date: dataSplit[1],
          expire_date: dataSplit[2],
          los: 1,
          rev_m1: dataSplit[4],
          loyalty_tier: tierSet._id,
          brand: brandSet._id,
          arpu: dataSplit[7],
          nik_dob: dataSplit[8],
          nik_rgn_name: dataSplit[9],
          region_lacci: dataSplit[10],
          cty_name: dataSplit[11],
          kabupaten: dataSplit[12],
          cluster_sales: dataSplit[13],
          kecamatan: dataSplit[14],
          pre_pst_flag: parseInt(dataSplit[15]),
        });
        await data.save();
        await transactionSession.commitTransaction();
      }
    } catch (e) {
      await transactionSession.abortTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }
}
