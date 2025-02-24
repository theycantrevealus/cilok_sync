import { HttpStatus, Injectable, StreamableFile } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { writeFileSync } from 'fs';
import mongoose, { Model, Types } from 'mongoose';
import { create as xmlCreate } from 'xmlbuilder';

import { GlobalResponse } from '@/dtos/response.dto';
import { Location, LocationDocument } from '@/location/models/location.model';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';

import { MerchantOutletDeleteDTOResponse } from '../dto/merchant.outlet.delete.dto';
import { OutletDeleteDTOResponse } from '../dto/outlet.delete.dto';
import {
  MerchantOutletAddDTO,
  MerchantOutletAddDTOResponse,
} from '../dto/outlet.merchant.add.dto';
import {
  MerchantOutletEditDTO,
  MerchantOutletEditDTOResponse,
} from '../dto/outlet.merchant.edit.dto';
import {
  MerchantOutlet,
  MerchantOutletDocument,
} from '../models/merchant.outlet.model';
import { Outlet, OutletDocument } from '../models/outlet.model';

@Injectable()
export class MerchantOutletService {
  constructor(
    @InjectModel(MerchantV2.name)
    private merchantV2Model: Model<MerchantV2Document>,

    @InjectModel(MerchantOutlet.name)
    private merchantOutletModel: Model<MerchantOutletDocument>,

    @InjectModel(Outlet.name)
    private outletModel: Model<OutletDocument>,

    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
  ) { }

  async get_merchant_outlet(param: any): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push(
      {
        $lookup: {
          from: 'merchantv2',
          let: { id: '$merchant' },
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
          as: 'merchant_detail',
        },
      },
      {
        $unwind: '$merchant_detail',
      },
    );

    query.push({
      $addFields: {
        outlet: {
          $map: {
            input: '$outlet',
            as: 'outlets_detail',
            in: { $toObjectId: '$$outlets_detail' },
          },
        },
      },
    });

    query.push({
      $lookup: {
        from: 'outlets',
        localField: 'outlet',
        foreignField: '_id',
        as: 'outlets_detail',
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
    }

    const allNoFilter = await this.merchantOutletModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const data = await this.merchantOutletModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async get_merchant_outlet_detail(param: any): Promise<any> {
    const data = await this.merchantOutletModel.aggregate(
      [
        {
          $lookup: {
            from: 'merchantv2',
            let: { id: '$merchant' },
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
            as: 'merchant_detail',
          },
        },
        {
          $unwind: '$merchant_detail',
        },
        {
          $lookup: {
            from: 'outlets',
            let: { id: '$outlet' },
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
            as: 'outlet_detail',
          },
        },
        {
          $unwind: '$outlet_detail',
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

  // async addMerchantOutlet(outletData: MerchantOutletAddDTO): Promise<MerchantOutletAddDTOResponse> {
  //   try {
  //     const response = new MerchantOutletAddDTOResponse();
  //     const existingMerchantOutlet = await this.merchantOutletModel.findOne({ merchant: new mongoose.Types.ObjectId(outletData.merchant) });

  //     let outletWithoutMerchant = false;
  //     if (existingMerchantOutlet) {
  //       let outletArray = [];
  //       for (const outletId of outletData.outlet) {
  //         const checkOutletMerchant = await this.outletModel.findOne({
  //           $or: [
  //             { merchant_id: { $exists: false } },
  //             { merchant_id: null }
  //           ],
  //           _id: outletId
  //         });
  //         if (checkOutletMerchant) {
  //           outletArray.push(checkOutletMerchant._id.toString());
  //         }
  //       }
  //       const outletAlready = existingMerchantOutlet.outlet;
  //       const mergedOutlet = Array.from(new Set(outletAlready.concat(outletArray)));
  //       await this.merchantOutletModel.updateMany(
  //         { _id: existingMerchantOutlet._id },
  //         { $set: { outlet: mergedOutlet } }
  //       );

  //       for (const outletIdFinish of mergedOutlet) {
  //         await this.outletModel.updateMany(
  //           { _id: outletIdFinish },
  //           { $set: { show_linked: true, merchant_id: existingMerchantOutlet.merchant } }
  //         );
  //       }

  //       const updatedMerchantOutlet = await this.merchantOutletModel.findOne({ _id: existingMerchantOutlet._id });

  //       response.message = 'Merchant Outlet Created Successfully';
  //       response.status = HttpStatus.OK;
  //       response.payload = updatedMerchantOutlet;
  //     } else {
  //       for (const outletId of outletData.outlet) {
  //         const checkOutletMerchant = await this.outletModel.findOne({
  //           merchant_id: { $ne: null },
  //           _id: outletId
  //         });

  //         if (checkOutletMerchant) {
  //           outletWithoutMerchant = true;
  //           break;
  //         }
  //       }

  //       if (outletWithoutMerchant) {
  //         response.message = 'Some outlets already have a merchant_id, please double-check';
  //         response.status = HttpStatus.BAD_REQUEST;
  //         response.payload = {};
  //       } else {
  //         const newOutlet = new this.merchantOutletModel(outletData);
  //         await newOutlet.save();
  //         for (const outletId of outletData.outlet) {
  //           await this.outletModel.updateMany({ _id: outletId }, { $set: { show_linked: true,merchant_id: outletData.merchant} });
  //         }
  //         response.message = 'Merchant Outlet Created Successfully';
  //         response.status = HttpStatus.OK;
  //         response.payload = newOutlet;
  //       }

  //     }
  //     return response;
  //   } catch (error) {
  //     throw new Error(error.message);
  //   }
  // }

  async editMerchantOutlet(
    data: MerchantOutletEditDTO,
    param: string,
  ): Promise<MerchantOutletEditDTOResponse> {
    const response = new MerchantOutletEditDTOResponse();
    return await this.merchantOutletModel
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
        response.status = HttpStatus.OK;
        response.message = 'Data edit merchant outlet success';
        response.payload = res;
        return response;
      });
  }

  async deleteMerchantOutlet(
    param: string,
    soft = true,
  ): Promise<MerchantOutletDeleteDTOResponse> {
    const response = new OutletDeleteDTOResponse();
    const oid = new mongoose.Types.ObjectId(param);
    if (soft) {
      return await this.merchantOutletModel
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
          response.status = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    } else {
      return await this.merchantOutletModel
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then((res) => {
          response.status = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    }
  }

  private async getRegion(id) {
    let name = null;

    const data = await this.locationModel.findById(id);
    if (data) {
      name = data?.name;
    }

    return name;
  }

  async generateMerchantOutletXmlFile(download = false, res = null) {
    const query = [];

    // outlet list
    query.push({
      $lookup: {
        from: 'merchantoutlets',
        let: { merchant_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$merchant', '$$merchant_id'] }],
              },
            },
          },
          {
            $project: {
              __v: false,
              merchant: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
          {
            $addFields: {
              outlet: {
                $map: {
                  input: '$outlet',
                  as: 'outlet_info',
                  in: { $toObjectId: '$$outlet_info' },
                },
              },
            },
          },
          {
            $lookup: {
              from: 'outlets',
              localField: 'outlet',
              foreignField: '_id',
              as: 'outlet_info',
            },
          },
        ],
        as: 'outlets_list',
      },
    });

    // merchant location
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

    const merchants = await this.merchantV2Model.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    // proses-proses
    const parsedMerchants = await Promise.all(
      merchants.map(async (m, i) => {
        let outlets = null;
        if (m.outlets_list?.[0]?.outlet_info?.length) {
          outlets = await Promise.all(
            m.outlets_list?.[0]?.outlet_info?.map(async (outlet, j) => {
              return {
                ROW: {
                  '@num': j + 1,
                  OUTLET_ID: outlet?._id ? outlet?._id.toString() : '',
                  OUTLET_NAME: outlet?.outlet_name ?? '',
                  OUTLET_ADDRESS:
                    outlet?.outlet_address ?? '',
                  LATITUDE: outlet?.latitude ?? '',
                  LONGITUDE: outlet?.langitude ?? '',
                  REGION: (await this.getRegion(outlet?.regional)) ?? '',
                  BRANCH: (await this.getRegion(outlet?.branch)) ?? '',
                },
              };
            }),
          );
        }

        return {
          ROW: {
            '@num': i + 1,
            MERCHANT_ID: m._id ? m._id.toString() : '',
            MERCHANT_NAME: m.merchant_name ?? '',
            MERCHANT_ADDRESS: m.address ?? '',
            MERCHANT_SHORT_CODE: m.merchant_short_code ?? '',
            MERCHANT_LOGO: m.merchant_logo ?? '',
            HYPERLINK1: m.hyperlink_1 ?? '',
            HYPERLINK1_TITLE: {
              ID: m.hyperlink_1_title.id ?? '',
              EN: m.hyperlink_1_title.en ?? '',
            },
            HYPERLINK2: m.hyperlink_2 ?? '',
            HYPERLINK2_TITLE: {
              ID: m.hyperlink_2_title.id ?? '',
              EN: m.hyperlink_2_title.en ?? '',
            },
            TITLE1: {
              ID: m.title_1.id ?? '',
              EN: m.title_1.en ?? '',
            },
            CONTENT1: {
              ID: m.content_1.id ?? '',
              EN: m.content_1.en ?? '',
            },
            TITLE2: {
              ID: m.title_2.id ?? '',
              EN: m.title_2.en ?? '',
            },
            CONTENT2: {
              ID: m.content_2.id ?? '',
              EN: m.content_2.en ?? '',
            },
            TITLE3: {
              ID: m.title_3.id ?? '',
              EN: m.title_3.en ?? '',
            },
            CONTENT3: {
              ID: m.content_3.id ?? '',
              EN: m.content_3.en ?? '',
            },
            OUTLETS: {
              ROWSET: outlets?.length ? outlets : [{}],
            },
          },
        };
      }),
    );

    // buat buffer XML nya
    const doc = xmlCreate({
      ROOT: {
        MERCHANTS: {
          ROWSET: parsedMerchants,
        },
      },
    });

    const buffer = doc.end({ pretty: true });

    // apakah download?
    if (download) {
      res.set({
        'Content-Disposition': `attachment; filename="merchant_outlet.xml"`,
      });

      return new StreamableFile(Buffer.from(buffer, 'utf-8'));
    } else {
      return buffer;
    }
  }

  async addOutletsToMerchant(data: {
    merchant: string;
    outlet: string[];
  }): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    try {
      const outlets = await this.outletModel.find({
        _id: { $in: data.outlet },
      });
      if (!outlets || outlets.length === 0) {
        throw new Error('No outlets found for the provided IDs');
      }
      const merchant = await this.merchantV2Model.findOneAndUpdate(
        { _id: data.merchant },
        { $addToSet: { outlet: outlets } },
        { new: true },
      );
      if (!merchant) {
        throw new Error('No merchant found for the provided ID');
      }
      await this.outletModel.updateMany(
        { _id: { $in: data.outlet } },
        { $set: { merchant_id: merchant._id } },
      );
      response.message = 'Success Linked Outlet to Merchant';
      response.statusCode = HttpStatus.CREATED;
      response.payload = merchant;
      return response;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async createOutletRow(outlet, j) {
    const OUTLET_ROW = {
      '@num': j + 1,
      OUTLET_ID: outlet?.outlet_code ? outlet?.outlet_code.toString() : '',
      OUTLET_NAME: outlet?.outlet_name ?? '',
      OUTLET_ADDRESS: outlet?.outlet_address ?? '',
      LATITUDE: outlet?.latitude ?? '',
      LONGITUDE: outlet?.longtitude ?? '',
      REGION: (await this.getRegion(outlet?.regional)) ?? '',
      BRANCH: (await this.getRegion(outlet?.branch)) ?? '',
    };
    return OUTLET_ROW;
  }

  async createRow(m, i) {
    let merchantLogo;
    if (m?.merchant_logo) {
      const merchantLogoSplit = m?.merchant_logo.split('/img');
      merchantLogo = merchantLogoSplit ? 'img' + merchantLogoSplit[1] : '';
    }

    const ROW = {
      '@num': i + 1,
      MERCHANT_ID: m._id ? m._id.toString() : '',
      MERCHANT_NAME: m.merchant_name ?? '',
      MERCHANT_ADDRESS: m.address ?? '',
      MERCHANT_SHORT_CODE: m.merchant_short_code ?? '',
      MERCHANT_LOGO: merchantLogo ?? '',
      HYPERLINK1: m.hyperlink_1 ?? '',
      HYPERLINK1_TITLE: {
        ID: m.hyperlink_1_title?.id ?? '',
        EN: m.hyperlink_1_title?.en ?? '',
      },
      HYPERLINK2: m.hyperlink2 ?? '',
      HYPERLINK2_TITLE: {
        ID: m.hyperlink_2_title?.id ?? '',
        EN: m.hyperlink_2_title?.en ?? '',
      },
      TITLE1: null,
      CONTENT1: null,
      TITLE2: null,
      CONTENT2: null,
      TITLE3: null,
      CONTENT3: null,
      OUTLETS: null,
    };

    //TITLE1
    if (m.title1) {
      ROW.TITLE1 = {
        ID: m.title1?.id ?? '',
        EN: m.title1?.en ?? '',
      };
    } else if (m.title_1) {
      ROW.TITLE1 = {
        ID: m.title_1?.id ?? '',
        EN: m.title_1?.en ?? '',
      };
    } else {
      ROW.TITLE1 = '';
    }

    //CONTENT1
    if (m.content1) {
      ROW.CONTENT1 = {
        ID: m.content1?.id ?? '',
        EN: m.content1?.en ?? '',
      };
    } else if (m.content_1) {
      ROW.CONTENT1 = {
        ID: m.content_1?.id ?? '',
        EN: m.content_1?.en ?? '',
      };
    } else {
      ROW.CONTENT1 = '';
    }

    //TITLE2
    if (m.title2) {
      ROW.TITLE2 = {
        ID: m.title2?.id ?? '',
        EN: m.title2?.en ?? '',
      };
    } else if (m.title_2) {
      ROW.TITLE2 = {
        ID: m.title_2?.id ?? '',
        EN: m.title_2?.en ?? '',
      };
    } else {
      ROW.TITLE2 = '';
    }

    //CONTENT2
    if (m.content1) {
      ROW.CONTENT2 = {
        ID: m.content2?.id ?? '',
        EN: m.content2?.en ?? '',
      };
    } else if (m.content_1) {
      ROW.CONTENT2 = {
        ID: m.content_2?.id ?? '',
        EN: m.content_2?.en ?? '',
      };
    } else {
      ROW.CONTENT2 = '';
    }

    //TITLE3
    if (m.title3) {
      ROW.TITLE3 = {
        ID: m.title3?.id ?? '',
        EN: m.title3?.en ?? '',
      };
    } else if (m.title_3) {
      ROW.TITLE3 = {
        ID: m.title_3?.id ?? '',
        EN: m.title_3?.en ?? '',
      };
    } else {
      ROW.TITLE3 = '';
    }

    //CONTENT3
    if (m.content3) {
      ROW.CONTENT3 = {
        ID: m.content3?.id ?? '',
        EN: m.content3?.en ?? '',
      };
    } else if (m.content_1) {
      ROW.CONTENT3 = {
        ID: m.content_3?.id ?? '',
        EN: m.content_3?.en ?? '',
      };
    } else {
      ROW.CONTENT3 = '';
    }

    if (m.outlet && m.outlet.length > 0) {
      ROW.OUTLETS = {
        ROWSET: {
          ROW: await Promise.all(
            m.outlet.map(async (outlet, j) => this.createOutletRow(outlet, j)),
          ),
        },
      };
    } else {
      ROW.OUTLETS = '';
    }
    return ROW;
  }

  async generateMerchantOutletXmlFileV2(download = false, res = null) {
    const query = [];

    //merchant location
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
        outlet: {
          $ifNull: ['$outlet', []],
        },
      },
    });

    const merchants = await this.merchantV2Model.aggregate(query);
    const merchantsXML = await Promise.all(
      merchants.map(async (m, i) => this.createRow(m, i)),
    );

    const root = {
      ROOT: {
        MERCHANTS: {
          ROWSET: {
            ROW: merchantsXML,
          },
        },
      },
    };
    const doc = xmlCreate(root, {
      headless: true,
      encoding: 'ut8',
      invalidCharReplacement: ' ',
    });
    const buffer = doc.end({ pretty: true });

    if (download) {
      res.header('Content-Type', 'application/xml');
      res.header(
        'Content-Disposition',
        'attachment; filename="merchant_outlet.xml"',
      );
      return res.send(buffer);
    } else {
      return buffer;
    }
  }
}
