import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import {
  PartnerAddBulkDTO,
  PartnerAddDTO,
  PartnerAddDTOResponse,
} from '../dto/partner.add.dto';
import { PartnerDeleteDTOResponse } from '../dto/partner.delete.dto';
import {
  PartnerEditDTO,
  PartnerEditDTOResponse,
} from '../dto/partner.edit.dto';
import { Partner, PartnerDocument } from '../models/partner.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

@Injectable()
export class PartnerService {
  constructor(
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {
    //
  }

  async checkAvailPatner(parameter: any): Promise<boolean> {
    return (
      (await this.partnerModel
        .findOne({
          $and: [parameter, { deleted_at: null }],
        })
        .exec()) === null
    );
  }

  async getPatnerPrime(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push({
      $match: {
        $and: [{ deleted_at: null }],
      },
    });

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
          if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value)
            autoColumn[a] = {
              $gte: new Date(date.start),
              $lt: new Date(date.end),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
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

    const allNoFilter = await this.partnerModel.aggregate(
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

    query.push({
      $addFields: {
        created_at: {
          $dateToString: {
            format: '%Y-%m-%dT%H:%M:%S.000', // Format yang Anda inginkan
            date: {
              $toDate: '$created_at' // Mengonversi field 'created_at' menjadi objek tanggal
            }
          }
        }
      }
    })

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const data = await this.partnerModel.aggregate(query, (err, result) => {
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

  async getPartner(param: any): Promise<any> {
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

    const data = this.partnerModel
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

  async addPartner(
    partnerData: PartnerAddDTO,
    created_by: any = null,
  ): Promise<PartnerAddDTOResponse> {
    const checkPatnerCode = await this.checkAvailPatner({
      'partner_code': partnerData.partner_code,
    });
    const response = new PartnerAddDTOResponse();
    if (checkPatnerCode) {
      const newPartner = new this.partnerModel({
        ...partnerData,
        created_by: created_by._id._id,
      });
      const process = newPartner.save().then(async (returning) => {
        return await returning;
      });

      if (process) {
        response.message = 'Partner Created Successfully';
        response.status = HttpStatus.OK;
        response.payload = process;
      } else {
        response.message = 'Partner Failed to Created';
        response.status = 400;
        response.payload = process;
      }
    } else {
      response.message = 'Duplicate patner code are not allowed';
      response.status = 400;
    }
    return response;
  }

  async addPartnerBulk(
    partnerData: PartnerAddBulkDTO,
    created_by: any = null,
  ): Promise<PartnerAddDTOResponse> {
    const modifiedWithAccount = [];
    partnerData.datas.map((e) => {
      modifiedWithAccount.push({
        ...e,
        created_by: created_by._id._id,
      });
    });
    const newPartner = await this.partnerModel.insertMany(modifiedWithAccount);

    const response = new PartnerAddDTOResponse();
    if (newPartner) {
      response.message = 'Partner Imported Successfully';
      response.status = HttpStatus.OK;
      response.payload = partnerData;
    } else {
      response.message = 'Partner Failed to Created';
      response.status = 400;
      response.payload = partnerData;
    }
    return response;
  }

  async editPartner(
    data: PartnerEditDTO,
    param: string,
  ): Promise<PartnerEditDTOResponse> {
    const process = this.partnerModel
      .findOneAndUpdate({ _id: param }, data)
      .then((results) => {
        return results;
      });

    const response = new PartnerEditDTOResponse();
    if (process) {
      response.message = 'Partner Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Partner Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deletePartner(param: string): Promise<PartnerDeleteDTOResponse> {
    const process = this.partnerModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new PartnerDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Partner Deleted Successfully';
    } else {
      response.status = 400;
      response.message = 'Partner Failed to Deleted';
    }
    return response;
  }
}
