import { InjectQueue } from '@nestjs/bull';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model } from 'mongoose';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';

import {
  MerchantAddDTO,
  MerchantAddDTOResponse,
} from '../dto/merchant.add.dto';
import { MerchantDeleteDTOResponse } from '../dto/merchant.delete.dto';
import {
  MerchantEditDTO,
  MerchantEditDTOResponse,
} from '../dto/merchant.edit.dto';
import { Merchant, MerchantDocument } from '../models/merchant.model';

@Injectable()
export class MerchantService {
  protected merchantQueue: Queue;
  constructor(
    @InjectModel(Merchant.name) private lovModel: Model<MerchantDocument>,
    @InjectQueue('merchant') merchantQueue: Queue,
  ) {
    this.merchantQueue = merchantQueue;
  }

  async getMerchant(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort && param.sort !== ''
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = this.lovModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .sort(sort_set)
      .exec()
      .then((results) => {
        if (results.length > 0) {
          return {
            total: results.length,
            data: results,
          };
        } else {
          return {
            total: 0,
            data: [],
          };
        }
      });

    return data;
  }

  async addMerchant(
    lovData: MerchantAddDTO,
    created_by: any = null,
  ): Promise<MerchantAddDTOResponse> {
    const newMerchant = new this.lovModel({
      ...lovData,
      created_by: created_by._id._id,
    });
    const process = newMerchant.save().then(async (returning) => {
      return await returning;
    });

    const response = new MerchantAddDTOResponse();
    if (process) {
      response.message = 'LOV Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'LOV Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async addMerchantBulk(
    fileData: LocalFileDto,
    created_by: any = null,
  ): Promise<any> {
    return this.merchantQueue
      .add(
        'merchant-import',
        {
          created_by: created_by,
          list: fileData,
        },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      });
  }

  async editMerchant(
    data: MerchantEditDTO,
    param: string,
  ): Promise<MerchantEditDTOResponse> {
    const process = this.lovModel
      .findOneAndUpdate({ _id: param }, data)
      .then((results) => {
        return results;
      });

    const response = new MerchantEditDTOResponse();
    if (process) {
      response.message = 'LOV Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'LOV Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deleteMerchant(param: string): Promise<MerchantDeleteDTOResponse> {
    const process = this.lovModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new MerchantDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'LOV Deleted Successfully';
    } else {
      response.status = 400;
      response.message = 'LOV Failed to Deleted';
    }
    return response;
  }
}
