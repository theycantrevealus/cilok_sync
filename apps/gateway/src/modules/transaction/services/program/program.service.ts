import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  ProgramWinner,
  ProgramWinnerDocument,
} from '@/transaction/models/program/program.winner.model';
import { Customer, CustomerDocument } from '@/customer/models/customer.model';
import { CustomerService } from '@/customer/services/customer.service';
import {
  allowedMSISDN,
  formatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
const moment = require('moment-timezone');

@Injectable()
export class ProgramService {
  private merchant_id: string;
  private realm_id: string;
  private branch_id: string;

  constructor(
    @InjectModel(ProgramWinner.name)
    private programWinnerModel: Model<ProgramWinnerDocument>,
    
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    
    private customerService: CustomerService,
    configService: ConfigService,
  ) {
    this.merchant_id = `${configService.get<string>('core-backend.merchant.id')}`;
    this.realm_id = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch_id = `${configService.get<string>('core-backend.branch.id')}`;
  }

  async program_winner(
    request: ProgramWinner,
    account: Account,
    token: string
  ): Promise<GlobalTransactionResponse> {
    let msisdn;
    const response = new GlobalTransactionResponse();
    if (allowedMSISDN(request.msisdn)) {
      msisdn = formatMsisdnCore(request.msisdn);
    }
    const cust = await this.customerModel.findOne({ msisdn }).lean()

    if (!cust) {
      response.code = HttpStatusTransaction.ERR_NOT_FOUND;
      response.message = 'Msisdn not found';
      response.payload = {
        trace_id: false,
      };

      return response
    } else {
      await this.customerService.getCoreMemberById(cust.core_id, token, this.merchant_id).then(async(cust_res) => {
        if(cust_res.code === 'S00000') {
          const core_member = cust_res.payload.member
          const core_update_data = {
            __v: core_member.__v,
            realm_id: this.realm_id,
            branch_id: this.branch_id,
            merchant_id: this.merchant_id,
            firstname: request.name ? request.name : (core_member.firstname ? undefined : ""),
            nik: request.nik ? request.nik : (core_member.nik ? undefined : ""),
            email: request.email ? request.email : (core_member.email ? undefined : ""),
            provinsi: request.province ? request.province : (core_member.provinsi ? undefined : ""),
            kabupaten: request.district ? request.district : (core_member.kabupaten ? undefined : ""),
            kecamatan: request.sub_district ? request.sub_district : (core_member.kecamatan ? undefined : ""),
            kode_pos: request.postal_code ? request.postal_code : (core_member.postal_code ? undefined : ""),
            alamat: request.address ? request.address : (core_member.address ? undefined : ""),
          }

          await this.customerService.updateCoreMember(cust.core_id, core_update_data, token).then(async(update_res) => {
            if(update_res.code === 'S00000') {
              const updated_customer = {
                core_firstname: request.name ? request.name : (core_member.firstname ? undefined : ""),
                nik: request.nik ? request.nik : (core_member.nik ? undefined : ""),
                email: request.email ? request.email : (core_member.email ? undefined : ""),
                provinsi: request.province ? request.province : (core_member.provinsi ? undefined : ""),
                kabupaten: request.district ? request.district : (core_member.kabupaten ? undefined : ""),
                kecamatan: request.sub_district ? request.sub_district : (core_member.kecamatan ? undefined : ""),
                kode_pos: request.postal_code ? request.postal_code : (core_member.postal_code ? undefined : ""),
                alamat: request.address ? request.address : (core_member.address ? undefined : ""),
              }
  
              await this.customerModel.updateOne({ _id: cust._id }, updated_customer)
            } else {
              response.code = HttpStatusTransaction.CODE_INTERNAL_ERROR;
              response.message = "Error updating data to core";
              response.transaction_classify = 'PROGRAM_WINNER';
              response.payload = {
                trace_id: request.transaction_id,
              };
              return response;
            }
          })
        } else {
          response.code = HttpStatusTransaction.ERR_NOT_FOUND;
          response.message = 'Msisdn not found';
          response.payload = {
            trace_id: false,
          };

          return response
        }
      })
    }

    const newData = new this.programWinnerModel({
      ...request,
      created_by: account,
    });

    return await newData
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then((data) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';
        response.transaction_classify = 'PROGRAM_WINNER';
        response.payload = {
          trace_id: `PGCR_${moment().format("YYYYMMDD")}_${data._id}`,
        };
        return response;
      });
  }
}
