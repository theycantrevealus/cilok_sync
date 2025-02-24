import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import mongoose, { Model, Types } from 'mongoose';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { GlobalResponse } from '@/dtos/response.dto';
import {
  ImageAuctionAddDTO,
  ImageAuctionDTOResponse,
} from '@/keyword/dto/keyword.image.auction.add.dto';
import {
  MerchantOutlet,
  MerchantOutletDocument,
  MerchantOutletSchema,
} from '@/merchant/models/merchant.outlet.model';
import { Outlet, OutletDocument } from '@/merchant/models/outlet.model';

import {
  MerchantV2AddDTO,
  MerchantV2AddDTOResponse,
} from '../dto/merchant.add.v2.dto';
import { MerchantV2DeleteDTOResponse } from '../dto/merchant.delete.v2.dto';
import {
  MerchantEditV2DTO,
  MerchantV2EditDTOResponse,
} from '../dto/merchant.edit.v2.dto';
import { MerchantV2, MerchantV2Document } from '../models/merchant.model.v2';

@Injectable()
export class MerchantV2Service {
  constructor(
    @InjectModel(MerchantV2.name)
    private merchantv2Model: Model<MerchantV2Document>,

    @InjectModel(MerchantOutlet.name)
    private merchantOutletModel: Model<MerchantOutletDocument>,

    @InjectModel(Outlet.name)
    private outletModel: Model<OutletDocument>,
  ) {}

  async dataFixMerchant(account) {
    const populatedMerchants = {};
    await this.merchantv2Model.find().then(async (merchantData) => {
      merchantData.map(async (eachMerchant) => {
        const targetMerchant = eachMerchant._id.toString();
        if (populatedMerchants[targetMerchant] === undefined) {
          populatedMerchants[targetMerchant] = [];
        }

        await this.merchantOutletModel
          .find({
            merchant: eachMerchant._id,
          })
          .then(async (merchantOutletData) => {
            await Promise.all(
              merchantOutletData.map(async (eachMerchantOutlet) => {
                await Promise.all(
                  eachMerchantOutlet.outlet.map((eachOutlet) => {
                    if (
                      populatedMerchants[targetMerchant].indexOf(eachOutlet) < 0
                    ) {
                      populatedMerchants[targetMerchant].push(eachOutlet);
                    }
                  }),
                );
              }),
            );
          });
      });
    });

    for (const a in populatedMerchants) {
      const listOutlet = await Promise.all(
        populatedMerchants[a].map(async (e) => {
          return new Promise(async (resolve, reject) => {
            const eachOutlet = await this.outletModel.findOne({
              _id: new Types.ObjectId(e),
            });

            await this.outletModel.findOneAndUpdate(
              {
                _id: new Types.ObjectId(e),
              },
              {
                merchant_detail: await this.merchantv2Model.findOne({
                  _id: new Types.ObjectId(a),
                }),
              },
            );

            resolve(eachOutlet);
          });
        }),
      );

      if (listOutlet.length > 0) {
        console.log(listOutlet);
      }

      await this.merchantv2Model
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(a),
          },
          {
            outlet: listOutlet,
          },
        )
        .exec();

      // if (dataSetMerchant && dataSetMerchant.length > 0) {
      //   await this.merchantOutletModel
      //     .deleteMany({
      //       merchant: new Types.ObjectId(a),
      //     })
      //     .then(async (dataResult) => {
      //       console.log(dataResult);
      //     })
      //     .catch((e) => {
      //       console.log(e);
      //     });
      //
      //   await this.merchantOutletModel
      //     .deleteMany({
      //       merchant: new Types.ObjectId(a),
      //     })
      //     .then(async () => {
      //       const newRelation = new this.merchantOutletModel({
      //         merchant: new Types.ObjectId(a),
      //         outlet: populatedMerchants[a],
      //         created_by: account,
      //       });
      //       await newRelation.save();
      //     });
      // } else {
      //   if (dataSetMerchant[a] && dataSetMerchant[a].length > 0) {
      //     const newDataMerchantOutlet = new this.merchantOutletModel({
      //       merchant: new Types.ObjectId(a),
      //       outlet: populatedMerchants[a],
      //       created_by: account,
      //     });
      //
      //     await newDataMerchantOutlet.save();
      //   }
      // }
    }
  }

  async get_merchant(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push({
      $match: {
        deleted_at: null,
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
    }

    if (sortField && sortOrder) {
      sort_set[sortField] = sortOrder;
      query.push({
        $sort: sort_set,
      });
    }

    const allNoFilter = await this.merchantv2Model
      .aggregate(
        [
          ...query,
          {
            $count: 'all',
          },
        ],
        { allowDiskUse: true }, // Enable disk use for counting
      )
      .collation({ locale: 'en' });

    query.push({ $skip: first });

    query.push({ $limit: rows });

    query.push({
      $lookup: {
        from: 'partners',
        let: { partner_id: '$partner_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  '$_id',
                  {
                    $convert: {
                      input: '$$partner_id',
                      to: 'objectId',
                      onNull: '',
                      onError: '',
                    },
                  },
                ],
              },
            },
          },
          {
            $project: {
              __v: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'partner_list',
      },
    });

    // query.push(
    //   {
    //     $addFields: {
    //       outlet: {
    //         $map: {
    //           input: '$outlet',
    //           as: 'outlet_info',
    //           in: { $toObjectId: '$$outlet_info' },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'outlets',
    //       localField: 'outlet',
    //       foreignField: '_id',
    //       as: 'outlet_list',
    //     },
    //   },
    // );

    // query.push({
    //   $lookup: {
    //     from: 'merchantoutlets',
    //     let: { merchant_id: '$_id' },
    //     pipeline: [
    //       {
    //         $match: {
    //           $expr: {
    //             $and: [{ $eq: ['$merchant', '$$merchant_id'] }],
    //           },
    //         },
    //       },
    //       {
    //         $project: {
    //           __v: false,
    //           merchant: false,
    //           created_at: false,
    //           updated_at: false,
    //           deleted_at: false,
    //         },
    //       },
    //       {
    //         $addFields: {
    //           outlet: {
    //             $map: {
    //               input: '$outlet',
    //               as: 'outlet_info',
    //               in: { $toObjectId: '$$outlet_info' },
    //             },
    //           },
    //         },
    //       },
    //       {
    //         $lookup: {
    //           from: 'outlets',
    //           localField: 'outlet',
    //           foreignField: '_id',
    //           as: 'outlet_info',
    //         },
    //       },
    //     ],
    //     as: 'outlets_list',
    //   },
    // });

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

    query.push(
      {
        $lookup: {
          from: 'roles',
          let: { id: '$pic_role_id' },
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
          as: 'role_detail',
        },
      },
      {
        $unwind: {
          path: '$role_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { id: '$poin_created_by' },
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
          as: 'poin_created_by_detail',
        },
      },
      {
        $unwind: {
          path: '$poin_created_by_detail',
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

    const data = await this.merchantv2Model
      .aggregate(query, { allowDiskUse: true }, (err, result) => {
        return result;
      })
      .collation({ locale: 'en' });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }

  async detail(param: string): Promise<any> {
    const data = await this.merchantv2Model.aggregate(
      [
        {
          $lookup: {
            from: 'partners',
            let: { partner_id: '$partner_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          '$_id',
                          {
                            $convert: {
                              input: '$$partner_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  __v: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'partner_list',
          },
        },
        // {
        //   $lookup: {
        //     from: 'merchantoutlets',
        //     let: { merchant_id: '$_id' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $and: [{ $eq: ['$merchant', '$$merchant_id'] }],
        //           },
        //         },
        //       },
        //       {
        //         $project: {
        //           __v: false,
        //           merchant: false,
        //           created_at: false,
        //           updated_at: false,
        //           deleted_at: false,
        //         },
        //       },
        //       {
        //         $addFields: {
        //           outlet: {
        //             $map: {
        //               input: '$outlet',
        //               as: 'outlet_info',
        //               in: { $toObjectId: '$$outlet_info' },
        //             },
        //           },
        //         },
        //       },
        //       {
        //         $lookup: {
        //           from: 'outlets',
        //           localField: 'outlet',
        //           foreignField: '_id',
        //           as: 'outlet_info',
        //         },
        //       },
        //     ],
        //     as: 'outlets_list',
        //   },
        // },
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
          $lookup: {
            from: 'roles',
            let: { id: '$pic_role_id' },
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
            as: 'role_detail',
          },
        },
        {
          $unwind: {
            path: '$role_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { id: '$poin_created_by' },
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
            as: 'poin_created_by_detail',
          },
        },
        {
          $unwind: {
            path: '$poin_created_by_detail',
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
    return data[0];
  }

  async addMerchant(
    merchantData: MerchantV2AddDTO,
    created_by: any = null,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    // Prepare outlet id

    const newMerchant = new this.merchantv2Model({
      ...merchantData,
      outlet: [],
      pic_role_id: created_by.role._id,
      poin_created_by: created_by._id._id,
      created_by: created_by._id._id,
    });
    return await newMerchant
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data Merchant add success';
        response.payload = newMerchant;
        return response;
      });
  }

  async editMerchant(
    data: MerchantEditV2DTO,
    param: string,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'EDIT_PIC';

    return await this.merchantv2Model
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(param),
        },
        {
          ...data,
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        throw new Error(e.message);
      })
      .then((res) => {
        response.statusCode = HttpStatus.OK;
        response.message = 'Data edit merchant success';
        response.payload = res;
        return response;
      });
  }

  async deleteMerchant(param: string, soft = true): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'DELETE_MERCHANT';
    const oid = new mongoose.Types.ObjectId(param);
    if (soft) {
      return await this.merchantv2Model
        .findOneAndUpdate(
          {
            _id: oid,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          throw new Error(e.message);
        })
        .then((res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    } else {
      return await this.merchantv2Model
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then((res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    }

    return response;
  }

  async imageupload(
    data: ImageAuctionAddDTO,
    fileData: LocalFileDto,
  ): Promise<ImageAuctionDTOResponse> {
    const SERVER_URL = `${process.env.FILE_SERVE_URL}/v2/merchant/${fileData.filename}`;
    const response = new ImageAuctionDTOResponse();
    if (response) {
      response.message = 'Image Upload Successfully';
      response.status = HttpStatus.OK;
      response.payload = `${SERVER_URL}`;
    } else {
      response.message = 'Image Upload Failed';
      response.status = HttpStatus.FORBIDDEN;
    }
    return response;
  }
}
