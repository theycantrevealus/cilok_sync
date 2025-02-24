import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import e from 'express';
import mongoose, { Error, Model, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { OutletAddDTO, OutletAddDTOResponse } from '../dto/outlet.add.dto';
import { OutletDeleteDTOResponse } from '../dto/outlet.delete.dto';
import { OutletEditDTO, OutletEditDTOResponse } from '../dto/outlet.edit.dto';
import { MerchantV2, MerchantV2Document } from '../models/merchant.model.v2';
import { Outlet, OutletDocument } from '../models/outlet.model';

@Injectable()
export class OutletService {
  constructor(
    @InjectModel(Outlet.name) private outletModel: Model<OutletDocument>,
    @InjectModel(MerchantV2.name) private merchant: Model<MerchantV2Document>,
  ) {}

  async get_outlet(param: any, show_linked: string): Promise<any> {
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
          if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value);
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

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    if (show_linked === 'false') {
      query.push({
        $match: {
          $and: [{ merchant_id: null }, { deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.outletModel
      .aggregate(query, (err, result) => {
        return result;
      })
      .collation({ locale: 'en' });

    query.push({ $skip: first });

    query.push({ $limit: rows });

    query.push({
      $lookup: {
        from: 'merchantv2',
        localField: 'merchant_id',
        foreignField: '_id',
        as: 'merchant_info',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'locations',
          let: { id: '$regional' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },
            {
              $project: {
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'regional_detail',
        },
      },
      {
        $unwind: {
          path: '$regional_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'locations',
          let: { id: '$branch' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },
            {
              $project: {
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'branch_detail',
        },
      },
      {
        $unwind: {
          path: '$branch_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'locations',
          let: { id: '$location_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$id'] }],
                },
              },
            },
            {
              $project: {
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'location_detail',
        },
      },
      {
        $unwind: {
          path: '$location_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $addFields: {
        created_at: {
          $dateToString: {
            format: '%Y-%m-%dT%H:%M:%S.000', // Format yang Anda inginkan
            date: {
              $toDate: '$created_at', // Mengonversi field 'created_at' menjadi objek tanggal
            },
          },
        },
      },
    });

    console.log('== QUERY ==', JSON.stringify(query));
    const data = await this.outletModel
      .aggregate(query, (err, result) => {
        return result;
      })
      .collation({ locale: 'en' });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async get_outlet_detail(param: any): Promise<any> {
    const data = await this.outletModel.aggregate(
      [
        {
          $lookup: {
            from: 'merchantoutlets',
            localField: '_id',
            foreignField: 'outlet',
            as: 'merchants',
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { id: '$regional' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$id'] }],
                  },
                },
              },
              {
                $project: {
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'regional_detail',
          },
        },
        {
          $unwind: {
            path: '$regional_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { id: '$branch' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$id'] }],
                  },
                },
              },
              {
                $project: {
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'branch_detail',
          },
        },
        {
          $unwind: {
            path: '$branch_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { id: '$location_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$id'] }],
                  },
                },
              },
              {
                $project: {
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'location_detail',
          },
        },
        {
          $unwind: {
            path: '$location_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $and: [
              { _id: new mongoose.Types.ObjectId(param) },
              { deleted_at: null },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return {
      data: data,
      total: data.length,
    };
  }

  async addOutlet(outletData: OutletAddDTO): Promise<OutletAddDTOResponse> {
    const newOutlet = new this.outletModel(outletData);
    const response = new OutletAddDTOResponse();
    return await newOutlet
      .save()
      .then(async () => {
        response.message = 'Outlet Created Successfully';
        response.status = HttpStatus.OK;
        response.payload = newOutlet;
        return response;
      })
      .catch((error: any) => {
        if (error?.code == 11000) {
          throw new BadRequestException([
            { isInvalidDataContent: 'Outlet code already is exist' },
          ]);
        } else {
          throw new BadRequestException([
            {
              isInvalidDataContent: error?.message
                ? error?.message
                : 'Internal server error',
            },
          ]);
        }
      });
  }

  async editOutlet(
    data: OutletEditDTO,
    param: string,
  ): Promise<OutletEditDTOResponse> {
    // First, update the outlet itself
    try {
      const outlet = await this.outletModel.findOneAndUpdate(
        { _id: new Types.ObjectId(param) },
        data,
        { new: true },
      );
      if (!outlet) {
        throw new BadRequestException([
          { isInvalidDataContent: 'Outlet not found' },
        ]);
      }

      // Then, find the merchant document which contains the outlet and update it
      const merchant = await this.merchant.findOne({
        outlet: { $elemMatch: { _id: param } },
      });
      if (merchant) {
        const outletIndex = merchant.outlet.findIndex(
          (out) => out?._id?.toString() === param,
        );
        if (outletIndex !== -1) {
          merchant.outlet[outletIndex] = outlet; // Replace the old outlet with the updated one
          await merchant.save(); // Save the updated merchant document
        }
      }

      const response = new OutletEditDTOResponse();
      response.message = 'Outlet Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;

      return response;
    } catch (error) {
      if (error?.code == 11000) {
        throw new BadRequestException([
          { isInvalidDataContent: 'Outlet code already is exist' },
        ]);
      } else {
        throw new BadRequestException([
          {
            isInvalidDataContent: error?.message
              ? error?.message
              : 'Internal server error',
          },
        ]);
      }
    }
  }

  async deleteOutlet(
    param: string,
    soft = true,
  ): Promise<OutletDeleteDTOResponse> {
    const response = new OutletDeleteDTOResponse();
    const outletId = new Types.ObjectId(param);
    if (soft) {
      const outlet = await this.outletModel.findOneAndUpdate(
        { _id: outletId },
        { deleted_at: new Date() },
      );
      if (!outlet) {
        throw new Error('Outlet not found');
      }

      // Remove the outlet object from the merchant's outlet array
      await this.merchant.updateMany(
        {},
        { $pull: { outlet: { _id: outletId } } },
      );

      response.status = HttpStatus.OK;
      response.message = 'Outlet Deleted Successfully';
      response.payload = outlet;
    } else {
      const outlet = await this.outletModel.findOneAndDelete({ _id: outletId });
      if (!outlet) {
        throw new Error('Outlet not found');
      }

      // Remove the outlet object from the merchant's outlet array
      await this.merchant.updateMany(
        {},
        { $pull: { outlet: { _id: outletId } } },
      );

      response.status = HttpStatus.OK;
      response.message = 'Outlet Deleted Successfully';
      response.payload = outlet;
    }

    return response;
  }
}
