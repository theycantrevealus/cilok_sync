import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { MerchantEditDTOResponse } from '@/merchant/dto/merchant.edit.dto';
import {
  MerchantPatnerAddDTO,
  MerchantPatnerAddDTOResponse,
} from '@/merchant/dto/merchant.patner.add.dto';
import { MerchantPatnerDeleteDTOResponse } from '@/merchant/dto/merchant.patner.delete.dto';
import { MerchantPatnerEditDTO } from '@/merchant/dto/merchant.patner.edit.dto';

import {
  MerchantPatner,
  MerchantPatnerDocument,
} from '../models/merchant.patner.model';
@Injectable()
export class MerchantPatnerService {
  constructor(
    @InjectModel(MerchantPatner.name)
    private merchantPatnerModel: Model<MerchantPatnerDocument>,
  ) {}

  async get_merchant(param: any): Promise<any> {
    const filter_set = JSON.parse(param.filter);
    const sort_set = JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = this.merchantPatnerModel
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

  async add(
    dataMerchantPatner: MerchantPatnerAddDTO,
    fileData: LocalFileDto,
  ): Promise<MerchantPatnerAddDTOResponse> {
    const newMerchantPatner = new this.merchantPatnerModel({
      // partner_code: dataMerchantPatner.partner_code,
      partner_name: dataMerchantPatner.partner_name,
      registration_number: dataMerchantPatner.registration_number,
      priority: dataMerchantPatner.priority,
      contact_person: dataMerchantPatner.contact_person,
      phone: dataMerchantPatner.phone,
      contact_email: dataMerchantPatner.contact_email,
      address: dataMerchantPatner.address,
      website: dataMerchantPatner.website,
      remark: dataMerchantPatner.remark,
      npwp: dataMerchantPatner.npwp,
      partner_logo: fileData.filename,
      longtitude: dataMerchantPatner.longtitude,
      latitude: dataMerchantPatner.latitude,
    });
    const process = await newMerchantPatner.save().then(async (returning) => {
      return returning;
    });
    const response = new MerchantPatnerAddDTOResponse();
    if (process) {
      response.message = 'Merchant Patner Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newMerchantPatner;
    } else {
      response.message = 'Merchant Patner Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async edit(
    data: MerchantPatnerEditDTO,
    fileData: LocalFileDto,
    param: string,
  ): Promise<MerchantEditDTOResponse> {
    const process = this.merchantPatnerModel
      .findOneAndUpdate(
        { _id: param },
        {
          // partner_code: data.partner_code,
          partner_name: data.partner_name,
          registration_number: data.registration_number,
          priority: data.priority,
          contact_person: data.contact_person,
          phone: data.phone,
          contact_email: data.contact_email,
          address: data.address,
          website: data.website,
          remark: data.remark,
          npwp: data.npwp,
          partner_logo: fileData.filename,
          longtitude: data.longtitude,
          latitude: data.latitude,
        },
      )
      .then((results) => {
        return results;
      });
    const response = new MerchantEditDTOResponse();
    if (process) {
      response.message = 'Merchant Patner Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Merchant Patner Failed to Updated';
      response.status = 400;
      response.payload = fileData;
    }
    return response;
  }

  async delete(param: string): Promise<MerchantPatnerDeleteDTOResponse> {
    const process = this.merchantPatnerModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new MerchantPatnerDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Merchant Patner Deleted Successfully';
      response.payload = process
    } else {
      response.status = 400;
      response.message = 'Merchant Patner Failed to Deleted';
      response.payload = process
    }
    return response;
  }

  async get_patner_prime(param: any): Promise<any>{
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.merchantPatnerModel.aggregate(
      [
        ...query,
        {
          $count: 'all',
        },
      ],
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const data = await this.merchantPatnerModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }
}
