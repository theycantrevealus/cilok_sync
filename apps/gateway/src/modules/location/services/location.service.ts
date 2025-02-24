import { ReportingServiceResult } from '@fmc_reporting_generation/model/reporting_service_result';
import { InjectQueue } from '@nestjs/bull';
import { CacheStore } from '@nestjs/cache-manager';
import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Queue } from 'bull';
import mongoose, { FilterQuery, Model, ObjectId, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { GeneralApiResponses } from '@/dtos/global.responses.dto';
import { GlobalResponse } from '@/dtos/response.dto';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { PIC, PICDocument } from '@/pic/models/pic.model';

import {
  bucketAddDTO,
  bucketResDTO,
  bucketUpdateBodyDTO,
} from '../attribute/bucket.api.helper';
import {
  LocationAddDTO,
  LocationAddDTOResponse,
  LocationBulkDTO,
} from '../dto/location.add.dto';
import { LocationBucketAddDTO } from '../dto/location.bucket.add.dto';
import { LocationBucketDeleteDTOResponse } from '../dto/location.bucket.delete.dto';
import {
  LocationBucketEditDTO,
  LocationBucketEditDTOResponse,
} from '../dto/location.bucket.edit.dto';
import { LocationDeleteDTOResponse } from '../dto/location.delete.dto';
import {
  LocationEditDTO,
  LocationEditDTOResponse,
} from '../dto/location.edit.dto';
import {
  LocationBucket,
  LocationBucketDocument,
} from '../models/location.bucket.model';
import { Location, LocationDocument } from '../models/location.model';

type RedisGetLocation = {
  name: string;
  typeId: Types.ObjectId;
  detail_type: 'region' | 'prov' | 'city';
};

type RedisGetLocationResult = Omit<RedisGetLocation, 'detail_type'> & {
  result: any;
};

@Injectable()
export class LocationService {
  protected loadFileQueue: Queue;

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    @InjectModel(PIC.name) private picModel: Model<PICDocument>,
    @InjectModel(LocationBucket.name)
    private locationBucketModel: Model<LocationBucketDocument>,

    @InjectQueue('location-queue')
    loadFileQueue: Queue,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    this.loadFileQueue = loadFileQueue;
  }

  async getLocationHierarchy(_id: string) {
    const location_detail = await this.detailLocation(_id);
    const location = {
      _id: location_detail._id,
      name: location_detail.name,
      type: location_detail.location_type.set_value,
      parent: location_detail.parent,
    };

    const locations: {
      _id: ObjectId;
      name: string;
      type: string;
      parent?: ObjectId;
    }[] = [location];

    let current_location = { ...location };

    while (current_location?.parent != null) {
      const parent_location = await this.detailLocation(
        current_location.parent,
      );
      current_location = {
        _id: parent_location._id,
        name: parent_location.name,
        type: parent_location.location_type.set_value,
        parent: parent_location.parent,
      };
      locations.push(current_location);
    }

    return { location, location_hierarchy: locations };
  }

  async getLocationDetail(filter: FilterQuery<LocationDocument>): Promise<any> {
    return await this.locationModel.findOne(filter);
  }

  async rebaseLocation(parent: string, type: string) {
    let old = [];
    const typeOID = new mongoose.Types.ObjectId(type);
    const parentOID = new mongoose.Types.ObjectId(parent);
    return await this.locationModel
      .aggregate([
        {
          $match: {
            $and: [{ deleted_at: null }, { parent: parentOID }],
            // $or: [{ _id: parentOID }],
          },
        },
        { $sort: { name: 1 } },
      ])
      .then(async (response) => {
        const prom = response.map(async (e): Promise<any> => {
          if (e.type.toString() === type) {
            old.push(e);
          } else {
            const abc = await this.rebaseLocation(e._id.toString(), type).then(
              (f) => {
                return f;
              },
            );
            if (abc.length > 0) {
              old = old.concat(abc);
            }
          }
        });

        return await Promise.all(prom).then((resp) => {
          return old;
        });
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });
  }

  async getLocationTree(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set = param.sort === '{}' ? { _id: 1 } : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id' || a === 'type' || a === 'parent'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.locationModel.aggregate(
      [
        {
          $lookup: {
            from: 'locationbuckets',
            localField: '_id',
            foreignField: 'location',
            as: 'bucket',
          },
        },
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
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

  async getLocation(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set = param.sort === '{}' ? { _id: 1 } : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id' || a === 'type' || a === 'parent'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.locationModel.aggregate(
      [
        {
          $lookup: {
            from: 'locationbuckets',
            localField: '_id',
            foreignField: 'location',
            as: 'bucket',
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'adhoc_group',
            foreignField: '_id',
            as: 'adhoc_group_detail',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            localField: 'type',
            foreignField: '_id',
            as: 'type_name',
          },
        },
        {
          $project: {
            name: true,
            type: true,
            type_name: {
              $ifNull: [{ $arrayElemAt: ['$type_name.set_value', 0] }, null],
            },
            data_source: { $ifNull: ['$data_source', null] },
            parent: { $ifNull: ['$parent', null] },
            prov: { $ifNull: ['$prov', null] },
            area: { $ifNull: ['$area', null] },
            region: { $ifNull: ['$region', null] },
            city: { $ifNull: ['$city', null] },
            prov_id: { $ifNull: ['$prov_id', null] },
            area_id: { $ifNull: ['$area_id', null] },
            region_id: { $ifNull: ['$region_id', null] },
            city_id: { $ifNull: ['$city_id', null] },
            adhoc_group: { $ifNull: ['$adhoc_group', []] },
            adhoc_group_info: {
              $map: {
                input: '$adhoc_group',
                as: 'adhoc_group_detail',
                in: {
                  $toObjectId: '$$adhoc_group_detail',
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'adhoc_group_info',
            foreignField: '_id',
            as: 'adhoc_group',
          },
        },
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
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

  async getLocationID(name: string): Promise<any> {
    const data = await this.locationModel.aggregate(
      [
        {
          $match: {
            $and: [{ name }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0]?._id;
  }

  async detailLocation(param: any): Promise<any> {
    const data = await this.locationModel.aggregate(
      [
        {
          $lookup: {
            from: 'locationbuckets',
            localField: '_id',
            foreignField: 'location',
            as: 'bucket',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            localField: 'type',
            foreignField: '_id',
            as: 'location_type',
          },
        },
        {
          $unwind: {
            path: '$location_type',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'adhoc_group',
            foreignField: '_id',
            as: 'adhoc_group_detail',
          },
        },
        {
          $project: {
            name: true,
            type: true,
            location_type: { $ifNull: ['$location_type', null] },
            data_source: { $ifNull: ['$data_source', null] },
            parent: { $ifNull: ['$parent', null] },
            area: { $ifNull: ['$area', null] },
            region: { $ifNull: ['$region', null] },
            city: { $ifNull: ['$city', null] },
            area_id: { $ifNull: ['$area_id', null] },
            region_id: { $ifNull: ['$region_id', null] },
            city_id: { $ifNull: ['$city_id', null] },
            adhoc_group: { $ifNull: ['$adhoc_group', []] },
            adhoc_group_info: {
              $map: {
                input: '$adhoc_group',
                as: 'adhoc_group_detail',
                in: {
                  $toObjectId: '$$adhoc_group_detail',
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'adhoc_group_info',
            foreignField: '_id',
            as: 'adhoc_group',
          },
        },
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
          },
        },
        { $sort: { name: 1 } },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }

  async addLocation(
    locationData: LocationAddDTO,
  ): Promise<LocationAddDTOResponse> {
    const checkLocationName = await this.checkAvailLocation(
      locationData.name,
      locationData.data_source,
    );

    const response = new LocationAddDTOResponse();
    if (checkLocationName) {
      response.status = HttpStatus.BAD_REQUEST;
      response.message = 'Location name is already taken';
      response.payload = { duplicate: true };
    } else {
      const newData = new this.locationModel({
        ...locationData,
      });
      return await newData
        .save()
        .catch((e: Error) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.message = 'Location Created Successfully';
          response.status = HttpStatus.OK;
          response.payload = newData;
          return response;
        });
    }
    return response;
  }

  async addLocationBulk(
    locationData: LocationBulkDTO,
    created_by: any = null,
  ): Promise<LocationAddDTOResponse> {
    const modifiedWithAccount = [];
    locationData.datas.map((e) => {
      modifiedWithAccount.push({
        ...e,
        created_by: created_by._id,
      });
    });

    const newLocation = await this.locationModel.insertMany(
      modifiedWithAccount,
    );

    const response = new LocationAddDTOResponse();
    if (newLocation) {
      response.message = 'Location Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newLocation;
    } else {
      response.message = 'Location Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async editLocation(
    data: LocationEditDTO,
    param: string,
  ): Promise<LocationEditDTOResponse> {
    const process = this.locationModel
      .findOneAndUpdate(
        { _id: param },
        {
          code: data.code,
          data_source: data.data_source,
          adhoc_group: data.adhoc_group,
          name: data.name,
          type: data.type,
          parent: data.parent,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new LocationEditDTOResponse();
    if (process) {
      response.message = 'Location Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Location Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deleteLocation(param: string): Promise<LocationDeleteDTOResponse> {
    const process = this.locationModel
      .findByIdAndUpdate({ _id: param }, { deleted_at: new Date() })
      .then((results) => {
        return results;
      });

    const response = new LocationDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Location Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Location Failed to Deleted';
      response.payload = process;
    }
    return response;
  }

  async getLocationPrimeTable(param: any): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovProvince = new mongoose.Types.ObjectId('643cf444c33b36f4eb4b8073');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const lovBranch = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bf');
    const lovCity = new mongoose.Types.ObjectId('63ede0e0df65223c4996c768');

    query.push({
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        parse_type: {
          $switch: {
            branches: [
              { case: { $eq: ['$type', lovArea] }, then: 'Area' },
              { case: { $eq: ['$type', lovProvince] }, then: 'Province' },
              { case: { $eq: ['$type', lovRegion] }, then: 'Region' },
              { case: { $eq: ['$type', lovCity] }, then: 'City' },
            ],
            default: 'Unknown',
          },
        },
        data_source: 1,
        parent: 1,
        prov: {
          $cond: {
            if: {
              $and: [
                {
                  $eq: ['$type', lovProvince],
                },
              ],
            },
            then: '$name',
            else: '$prov',
          },
        },
        area: {
          $cond: {
            if: {
              $and: [
                {
                  $eq: ['$type', lovArea],
                },
              ],
            },
            then: '$name',
            else: '$area',
          },
        },
        region: {
          $cond: {
            if: {
              $and: [
                {
                  $eq: ['$type', lovRegion],
                },
              ],
            },
            then: '$name',
            else: '$region',
          },
        },
        branch: {
          $cond: {
            if: {
              $and: [
                {
                  $eq: ['$type', lovBranch],
                },
              ],
            },
            then: '$name',
            else: '$branch',
          },
        },
        prov_id: 1,
        area_id: 1,
        region_id: 1,
        city_id: 1,
        adhoc_group: 1,
        adhoc_group_info: 1,
        deleted_at: 1,
        city: {
          $cond: {
            if: {
              $and: [
                {
                  $or: [
                    {
                      $eq: ['$city', ''],
                    },
                    {
                      $eq: ['$city', null],
                    },
                  ],
                },
                {
                  $eq: ['$type', lovCity],
                },
              ],
            },
            then: '$name',
            else: '',
          },
        },
      },
    });

    query.push({
      $lookup: {
        from: 'locationbuckets',
        localField: '_id',
        foreignField: 'location',
        as: 'bucket',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'locations',
          localField: 'adhoc_group',
          foreignField: '_id',
          as: 'adhoc_group_detail',
        },
      },
      {
        $project: {
          name: true,
          type: true,
          deleted_at: true,
          data_source: { $ifNull: ['$data_source', null] },
          parent: { $ifNull: ['$parent', null] },
          prov: { $ifNull: ['$prov', null] },
          area: { $ifNull: ['$area', null] },
          region: { $ifNull: ['$region', null] },
          branch: { $ifNull: ['$branch', null] },
          city: { $ifNull: ['$city', null] },
          prov_id: { $ifNull: ['$prov_id', null] },
          area_id: { $ifNull: ['$area_id', null] },
          region_id: { $ifNull: ['$region_id', null] },
          city_id: { $ifNull: ['$city_id', null] },
          adhoc_group: { $ifNull: ['$adhoc_group', []] },
          adhoc_group_info: {
            $map: {
              input: '$adhoc_group',
              as: 'adhoc_group_detail',
              in: {
                $toObjectId: '$$adhoc_group_detail',
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'adhoc_group_info',
          foreignField: '_id',
          as: 'adhoc_group',
        },
      },
    );

    const filter_builder: any = { $and: [], $or: [] };
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
          } else if (a === 'type') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'data_source') {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          if (a === 'type') {
            autoColumn[a] = {
              $not: {
                $eq: new mongoose.Types.ObjectId(filterSet[a].value),
              },
            };
          } else if (a === 'data_source') {
            autoColumn[a] = {
              $not: {
                $eq: filterSet[a].value,
              },
            };
          } else {
            autoColumn[a] = {
              $not: {
                $eq: filterSet[a].value,
              },
            };
          }
        }

        filter_builder.$and.push(autoColumn);
        // if ((a === 'city' || a === 'branch') && filterSet[a].value !== '') {
        //   filter_builder.$or.push({
        //     type: {
        //       $eq: lovCity,
        //     },
        //   });
        //   filter_builder.$or.push({
        //     type: {
        //       $eq: lovBranch,
        //     },
        //   });
        // }

        // filter_builder.$or.push({
        //   name: {
        //     $regex: new RegExp(`${filterSet[a].value}`, 'i'),
        //   },
        // });
      }
    }

    if (filter_builder.$and.length > 0) {
      filter_builder.$and.push({ deleted_at: null });
    } else {
      filter_builder.$or.push({
        type: {
          $eq: lovCity,
        },
      });
      filter_builder.$or.push({
        type: {
          $eq: lovBranch,
        },
      });
      filter_builder.$and.push({ deleted_at: null });
    }

    if (filter_builder.$and.length > 0) {
      if (filter_builder.$or.length > 0) {
        query.push({
          $match: {
            $and: [
              ...filter_builder.$and,
              {
                $or: filter_builder.$or,
              },
            ],
          },
        });
      } else {
        query.push({
          $match: {
            $and: [...filter_builder.$and],
          },
        });
      }
    }

    const allNoFilter = await this.locationModel.aggregate(
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

    // console.log(JSON.stringify(query));

    const data = await this.locationModel.aggregate(query, (err, result) => {
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

  // =====================BUCKET=======================
  async addBucket(data: bucketAddDTO, credential: any): Promise<bucketResDTO> {
    const response = new bucketResDTO();
    const new_data = new this.locationBucketModel();

    // check duplicate bucket_name
    let qCount = await this.locationBucketModel.count({
      bucket_name: data.bucket_name,
    });
    if (qCount > 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket Name is already exists';
      response.payload = data;
      return response;
    }
    new_data.bucket_name = data.bucket_name;
    // end check duplicate bucket name

    // check if bucket type id is valid LOV id
    const lovId = new mongoose.Types.ObjectId(data.bucket_type);
    qCount = await this.lovModel.count({ _id: lovId });
    if (qCount == 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket type from lov is not found.';
      response.payload = data;
      return response;
    }
    const qLov = await this.lovModel.findById(lovId).exec();
    if (qLov.group_name !== 'BUCKET_TYPE') {
      response.status = GeneralApiResponses.R400.status;
      response.message =
        "LOV ID is wrong, make sure group_name is 'BUCKET_TYPE'";
      response.payload = data;
      return response;
    }
    new_data.bucket_type = {
      lov_id: lovId,
      set_value: qLov.set_value,
      specify_data: data.specify_data,
    };
    // end check if bucket type id is valid LOV id

    // pic data
    const picId = new mongoose.Types.ObjectId(data.pic);
    qCount = await this.picModel.count({ _id: picId });
    if (qCount == 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'PIC ID is not found.';
      response.payload = data;
      return response;
    }
    const qPic = await this.picModel.findById(picId).exec();
    new_data.pic = {
      pic_id: picId,
      name: qPic.name,
      msisdn: qPic.msisdn,
      email: qPic.email,
    };
    // end pic data

    // location data
    if (typeof data.location === 'undefined') {
      const typeId = credential.account_location.location_detail.type;
      const qLocType = await this.lovModel.findById(typeId).exec();
      new_data.location_data = {
        location_id: credential.account_location.location,
        name: credential.account_location.location_detail.name,
        type: {
          lov_id: typeId,
          set_value: qLocType.set_value,
        },
      };
    } else {
      const locId = new mongoose.Types.ObjectId(data.location);
      const qLocDetail = await this.locationModel.findById(locId).exec();
      const qLocType = await this.lovModel.findById(qLocDetail.type).exec();
      new_data.location_data = {
        location_id: locId,
        name: qLocDetail.name,
        type: {
          lov_id: qLocDetail.type,
          set_value: qLocType.set_value,
        },
      };
      new_data.location_type_data = data.location_type ?? null;
      new_data.location_area_data = data.location_area_identifier ?? null;
      new_data.location_region_data = data.location_region_identifier ?? null;
    }
    // end location data

    const prepare = new this.locationBucketModel(new_data);
    const process = await prepare.save().then(async (returning) => {
      return await returning;
    });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: new_data };
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = GeneralApiResponses.R400.description;
      response.payload = process;
    }
    return response;
  }

  async deleteBucket(param): Promise<any> {
    const response = new bucketResDTO();
    const bucketId = new mongoose.Types.ObjectId(param._id);
    const qCount = await this.locationBucketModel.count({ _id: bucketId });
    if (qCount === 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket Data is not found';
      response.payload = { data: param };
      return response;
    }
    const process = await this.locationBucketModel
      .findOneAndUpdate(
        { _id: param },
        { deleted_at: new Date() },
        { new: true },
      )
      .then((results) => {
        return results;
      });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: param };
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = GeneralApiResponses.R400.description;
      response.payload = process;
    }
    return response;
  }

  async deleteBucketBulk(data): Promise<any> {
    const response = new bucketResDTO();
    const objectIdArray = data.list_id.map(
      (s) => new mongoose.Types.ObjectId(s),
    );
    const process = await this.locationBucketModel
      .updateMany(
        { _id: { $in: objectIdArray } },
        { deleted_at: new Date() },
        { new: true },
      )
      .then((results) => {
        return results;
      });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: data };
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = GeneralApiResponses.R400.description;
      response.payload = process;
    }
    return response;
  }

  async editBucket(data: bucketUpdateBodyDTO, param, credential): Promise<any> {
    const response = new bucketResDTO();
    const bucketId = new mongoose.Types.ObjectId(param._id);

    type dtModel = {
      bucket_name: string;
      bucket_type: object;
      pic: object;
      location_data: object;
      location_type_data: object;
      location_area_data: object;
      location_region_data: object;
      updated_at: Date;
    };
    const new_data = {} as dtModel;

    // check duplicate bucket_name
    let qCount = await this.locationBucketModel.count({
      _id: { $ne: bucketId },
      bucket_name: data.bucket_name,
    });
    if (qCount > 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket Name is already exists';
      response.payload = data;
      return response;
    }
    new_data.bucket_name = data.bucket_name;
    // end check duplicate bucket name

    // check if bucket type id is valid LOV id
    const lovId = new mongoose.Types.ObjectId(data.bucket_type);
    qCount = await this.lovModel.count({ _id: lovId });
    if (qCount == 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket type from lov is not found.';
      response.payload = data;
      return response;
    }
    const qLov = await this.lovModel.findById(lovId).exec();
    if (qLov.group_name !== 'BUCKET_TYPE') {
      response.status = GeneralApiResponses.R400.status;
      response.message =
        "LOV ID is wrong, make sure group_name is 'BUCKET_TYPE'";
      response.payload = data;
      return response;
    }
    new_data.bucket_type = {
      lov_id: lovId,
      set_value: qLov.set_value,
      specify_data: data.specify_data,
    };
    // end check if bucket type id is valid LOV id

    // pic data
    const picId = new mongoose.Types.ObjectId(data.pic);
    qCount = await this.picModel.count({ _id: picId });
    if (qCount == 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'PIC ID is not found.';
      response.payload = data;
      return response;
    }
    const qPic = await this.picModel.findById(picId).exec();
    new_data.pic = {
      pic_id: picId,
      name: qPic.name,
      msisdn: qPic.msisdn,
      email: qPic.email,
    };
    // end pic data

    // location data
    if (typeof data.location === 'undefined') {
      const typeId = credential.account_location.location_detail.type;
      const qLocType = await this.lovModel.findById(typeId).exec();
      new_data.location_data = {
        location_id: credential.account_location.location,
        name: credential.account_location.location_detail.name,
        type: {
          lov_id: typeId,
          set_value: qLocType.set_value,
        },
      };
    } else {
      const locId = new mongoose.Types.ObjectId(data.location);
      const qLocDetail = await this.locationModel.findById(locId).exec();
      const qLocType = await this.lovModel.findById(qLocDetail.type).exec();
      new_data.location_data = {
        location_id: locId,
        name: qLocDetail.name,
        type: {
          lov_id: qLocDetail.type,
          set_value: qLocType.set_value,
        },
      };
      new_data.location_type_data = data.location_type ?? null;
      new_data.location_area_data = data.location_area_identifier ?? null;
      new_data.location_region_data = data.location_region_identifier ?? null;
    }
    // end location data

    new_data.updated_at = new Date();
    const process = await this.locationBucketModel.findOneAndUpdate(
      { _id: bucketId },
      new_data,
      { new: true },
    );

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: new_data };
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = GeneralApiResponses.R400.description;
      response.payload = process;
    }
    return response;
  }

  async getBucketPrime(param: any, credential: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    for (const key in filters) {
      if (key === 'location_data.location_id') {
        filters['location_data.location_id'].value =
          new mongoose.Types.ObjectId(
            filters['location_data.location_id'].value,
          );
      }
    }

    const query = [];
    const sort_set = {};

    query.push({
      $lookup: {
        from: 'locations',
        let: { location_id: '$location' },
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
                          input: '$$location_id',
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
        ],
        as: 'location',
      },
    });

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

    // ================== FILTER LOCATION
    const locFilterArry = [];
    const parentId = credential.account_location.location;
    // console.log("=== LOCATION PARENTID ===",parentId)
    const qLoc = await this.locationModel
      .find({ parent: parentId }, { _id: 1 })
      .exec();

    if (qLoc.length > 0) {
      qLoc.forEach(function (loopVal) {
        locFilterArry.push(loopVal._id);
      });
    }

    if (locFilterArry.length > 0) {
      const qLoc2 = await this.locationModel
        .find({ parent: { $in: locFilterArry } }, { name: 1 })
        .exec();
      qLoc2.forEach(function (loopVal) {
        locFilterArry.push(loopVal._id);
      });
    }
    locFilterArry.push(parentId);
    // query.push({
    //   $match: {
    //     'location_data.location_id': { $in: locFilterArry },
    //   },
    // });
    // ================== END FILTER LOCATION

    // console.log(JSON.stringify(query));
    const allNoFilter = await this.locationBucketModel.aggregate(
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

    const data = await this.locationBucketModel.aggregate(
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

  async viewBucket(param): Promise<any> {
    const response = new bucketResDTO();
    const bucketId = new mongoose.Types.ObjectId(param._id);
    const qCount = await this.locationBucketModel.count({ _id: bucketId });
    if (qCount === 0) {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Bucket Data is not found';
      response.payload = { data: param };
      return response;
    }
    const process = await this.locationBucketModel
      .findById(bucketId)
      .then((results) => {
        return results;
      });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: process };
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = GeneralApiResponses.R400.description;
      response.payload = process;
    }
    return response;
  }

  async detailLocationByName(param: any): Promise<any> {
    console.log(param);
    if (param) {
      const data = await this.locationModel.aggregate(
        [
          {
            $lookup: {
              from: 'locationbuckets',
              localField: '_id',
              foreignField: 'location',
              as: 'bucket',
            },
          },
          {
            $match: {
              $and: [{ name: param.toString() }, { deleted_at: null }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );
      return data[0];
    } else {
      return param;
    }
  }

  async import_location(
    account: any = null,
    fileData: LocalFileDto,
  ): Promise<any> {
    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';
    await this.csvToJson(fileData.path, account);
    response.message = 'Import Location successfully';
    response.statusCode = HttpStatus.OK;
    return response;
  }

  protected async checkAvailName(parameter: any): Promise<boolean> {
    return (
      (await this.locationModel
        .findOne({
          $and: [parameter, { deleted_at: null }],
        })
        .exec()) === null
    );
  }

  protected async genereteLocation(
    object: any,
    account: any = null,
  ): Promise<any> {
    let id_area = '';
    let id_region = '';

    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';

    //Check Area
    const checkLocation = await this.locationModel
      .findOne({
        name: object.AREA_NAME,
        type: new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd'),
        parent: new mongoose.Types.ObjectId('62ffd9ed1e38fbdeb16f1f53'),
      })
      .exec();
    if (!checkLocation) {
      const data = {
        name: object.AREA_NAME,
        type: new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd'),
        parent: new mongoose.Types.ObjectId('62ffd9ed1e38fbdeb16f1f53'),
      };
      const checkArea = await this.checkAvailName({
        name: object.AREA_NAME,
      });
      if (checkArea) {
        const newArea = new this.locationModel({
          ...data,
          created_by: account.core_payload.user_profile._id,
        });
        await newArea
          .save()
          .then(async (res) => {
            id_area = res._id;
          })
          .catch((e) => {
            throw new Error(e);
          });
      }
    } else {
      id_area = checkLocation._id;
    }

    //CheckRegion
    const checkRegion = await this.locationModel
      .findOne({
        name: object.REGION_DESC,
        type: new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be'),
        parent: id_area,
      })
      .exec();
    if (!checkRegion) {
      const dataRegion = {
        name: object.REGION_DESC,
        type: new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be'),
        parent: id_area,
        area: object.AREA_NAME,
        region: object.REGION_DESC,
        area_id: id_area,
      };
      const checAvailkRegion = await this.checkAvailName({
        name: object.REGION_DESC,
      });
      if (checAvailkRegion) {
        const newRegion = new this.locationModel({
          ...dataRegion,
          created_by: account.core_payload.user_profile._id,
        });
        await newRegion
          .save()
          .then(async (res) => {
            id_region = res._id;
          })
          .catch((e) => {
            throw new Error(e);
          });
      }
    } else {
      id_region = checkRegion._id;
    }

    //Check City
    const checkCity = await this.locationModel
      .findOne({
        name: object.KOTA_NAME,
        type: new mongoose.Types.ObjectId('6368d5216e12ca14727b089f'),
        parent: id_region,
      })
      .exec();
    if (!checkCity) {
      const dataCity = {
        name: object.KOTA_NAME,
        type: new mongoose.Types.ObjectId('6368d5216e12ca14727b089f'),
        parent: id_region,
        area: object.AREA_NAME,
        region: object.REGION_DESC,
        city: object.KOTA_NAME,
        area_id: id_area,
        region_id: id_region,
      };
      const checkAvailCity = await this.checkAvailName({
        name: object.KOTA_NAME,
      });
      if (checkAvailCity) {
        const newCity = new this.locationModel({
          ...dataCity,
          created_by: account.core_payload.user_profile._id,
        });
        await newCity
          .save()
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .then(async () => {})
          .catch((e) => {
            throw new Error(e);
          });
      }
    }
  }

  protected async csvToJson(fileData: any, account: any = null): Promise<any> {
    const csv = require('csvtojson');
    const JsonArray = await csv().fromFile(fileData);
    for (const file of JsonArray) {
      await this.genereteLocation(file, account);
    }
  }

  /**
   * Function for extract location file
   * Using nest/bull for process big file
   * @param filePath
   */
  async importLocationV2(filePath: string) {
    return this.loadFileQueue
      .add(
        'location-file-import-wow',
        { path: filePath },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Function for extract location timezone file
   * Using nest/bull for process big file
   * @param filePath
   */
  async importLocationTimezone(filePath: string) {
    return this.loadFileQueue
      .add(
        'location-timezone-import',
        { path: filePath },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async checkAvailLocation(
    parameter: string,
    data_source: string,
  ): Promise<any> {
    const regex = new RegExp(['^', parameter, '$'].join(''), 'igm');
    return await this.locationModel
      .findOne({
        $and: [
          { name: regex },
          { data_source: data_source },
          { deleted_at: null },
        ],
      })
      .exec();
  }

  /**
   * Function for extract location file
   * Using nest/bull for process big file
   * @param filePath
   */
  async importLocationHRISSIAD(filePath: string) {
    return this.loadFileQueue
      .add(
        'location-hris-siad-file-import',
        { path: filePath },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  public async generateLocationDetail(payload: any): Promise<void | any> {
    const cronResult = new ReportingServiceResult({ is_error: false });
    const _area = 'Area';
    const _region = 'Region';
    const _city = 'City';

    try {
      const lovLocationType = await this.lovModel.find({
        group_name: 'LOCATION_TYPE',
        set_value: { $in: [_area, _region, _city] },
      });

      const areaType = lovLocationType.find(
        ({ set_value }) => set_value === _area,
      );

      const regionType = lovLocationType.find(
        ({ set_value }) => set_value === _region,
      );

      const cityType = lovLocationType.find(
        ({ set_value }) => set_value === _city,
      );

      const [areaLocationDetail, regionLocationDetail] = await Promise.all([
        this.getAreaLocationDetail(areaType._id, regionType._id, cityType._id),
        this.getRegionLocationDetail(regionType._id, cityType._id),
      ]);

      for (const location of [...areaLocationDetail, ...regionLocationDetail]) {
        await this.locationModel.updateOne(
          { _id: location._id },
          {
            region_detail: location['region_detail'] ?? null,
            prov_detail: location['prov_detail'] ?? null,
            city_detail: location['city_detail'] ?? null,
          },
        );
      }

      cronResult.message = 'Cron Generate Location Detail Done';

      await this.checkAndSetLog(
        'Reward Catalog Generate Location Detail',
        cronResult,
        payload,
        new Date(),
      );
    } catch (error) {
      console.log('ERROR generateLocationDetail');
      console.log(error);
      console.log(error.message);
      cronResult.is_error = true;
      cronResult.message = error.message;
      cronResult.stack = error.stack;
      await this.checkAndSetLog(
        'Reward Catalog Generate Location Detail',
        cronResult,
        payload,
        new Date(),
      );
    }
  }

  private async getAreaLocationDetail(
    areaId: Types.ObjectId,
    regionId: Types.ObjectId,
    cityId: Types.ObjectId,
  ) {
    return await this.locationModel.aggregate([
      {
        $match: {
          type: areaId,
          data_source: 'LACIMA',
        },
      },
      {
        $lookup: {
          from: 'locations',
          let: {
            id: '$_id',
            data_source: '$data_source',
            type: regionId,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$area_id', '$$id'] },
                    { $eq: ['$type', '$$type'] },
                    {
                      $eq: ['$data_source', '$$data_source'],
                    },
                  ],
                },
              },
            },
          ],
          as: 'region_detail',
        },
      },
      {
        $addFields: {
          region_detail: {
            $map: {
              input: '$region_detail',
              as: 'region',
              in: '$$region.name',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'locations',
          let: {
            area_region: '$region_detail',
            data_source: '$data_source',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$data_source', '$$data_source'],
                    },
                    {
                      $in: ['$region', '$$area_region'],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$prov',
              },
            },
          ],
          as: 'prov_detail',
        },
      },
      {
        $addFields: {
          prov_detail: {
            $map: {
              input: '$prov_detail',
              as: 'prov_region',
              in: '$$prov_region._id',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'locations',
          let: {
            id: '$_id',
            data_source: '$data_source',
            type: cityId,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$area_id', '$$id'] },
                    { $eq: ['$type', '$$type'] },
                    {
                      $eq: ['$data_source', '$$data_source'],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$name',
              },
            },
          ],
          as: 'city_detail',
        },
      },
      {
        $addFields: {
          city_detail: {
            $map: {
              input: '$city_detail',
              as: 'city_detail',
              in: '$$city_detail._id',
            },
          },
        },
      },
    ]);
  }

  private async getRegionLocationDetail(
    regionId: Types.ObjectId,
    cityId: Types.ObjectId,
  ) {
    return await this.locationModel.aggregate([
      {
        $match: {
          type: regionId,
          data_source: 'LACIMA',
        },
      },
      {
        $addFields: {
          region_detail: null,
        },
      },
      {
        $lookup: {
          from: 'locations',
          let: {
            parent: '$_id',
            data_source: '$data_source',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$data_source', '$$data_source'],
                    },
                    {
                      $eq: ['$parent', '$$parent'],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$prov',
              },
            },
          ],
          as: 'prov_detail',
        },
      },
      {
        $addFields: {
          prov_detail: {
            $map: {
              input: '$prov_detail',
              as: 'prov_detail',
              in: '$$prov_detail._id',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'locations',
          let: {
            parent: '$_id',
            data_source: '$data_source',
            type: cityId,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$type', '$$type'] },
                    {
                      $eq: ['$data_source', '$$data_source'],
                    },
                    {
                      $eq: ['$parent', '$$parent'],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$name',
              },
            },
          ],
          as: 'city_detail',
        },
      },
      {
        $addFields: {
          city_detail: {
            $map: {
              input: '$city_detail',
              as: 'city_detail',
              in: '$$city_detail._id',
            },
          },
        },
      },
    ]);
  }

  public async getLocationDetailRedis(payloads: RedisGetLocation[]): Promise<Array<RedisGetLocationResult>> {
    const result = [] as Array<RedisGetLocationResult>;

    for (const payload of payloads) {
      const { name, typeId, detail_type } = payload;

      const lovLocationType = await this.lovModel.findById(typeId);
      const { set_value: typeName } = lovLocationType;

      /**
       * Format : nc-rc-{type}-{name}-{detail_type}
       */
      const key = `nc-rc-${typeName.toLowerCase()}-${name.toLowerCase()}-${detail_type.toLowerCase()}`;
      const locationDetailFromRedis = await this.cacheManager.get(key);
      console.log('KEY', key);

      if (locationDetailFromRedis) {
        console.log('FROM REDIS', locationDetailFromRedis);
        result.push({
          ...payload,
          result: locationDetailFromRedis,
        });

        continue;
      }

      const locationDetailFromDb = await this.locationModel.findOne({
        name,
        data_source: 'LACIMA',
        type: typeId,
      });
      console.log('FROM DB', locationDetailFromDb);

      if (locationDetailFromDb) {
        const formattedDetail =
          locationDetailFromDb[`${detail_type}_detail`].join(',');

        await this.cacheManager.set(key, formattedDetail, {
          ttl: 24 * 60 * 60,
        }); //24 hours

        result.push({
          ...payload,
          result: formattedDetail,
        });
      }
    }

    console.log('RESULT', result);

    return result;
  }

  async checkAndSetLog(
    transcationName: string,
    result: ReportingServiceResult,
    payload: any,
    startTime: Date,
  ) {
    let errStatus = false,
      errCode = result?.custom_code ?? HttpStatus.OK;

    const errResult = { ...result };
    if (errResult.is_error) {
      errStatus = true;
      errCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // insert logging
    await this.loggerReportGeneration(
      payload,
      errStatus,
      transcationName,
      errResult,
      startTime,
      errCode,
    );
  }

  /**
   * For handle log reporting generation
   */
  async loggerReportGeneration(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload?.tracing_id ?? '-',
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_generation',
        service: this.constructor.name,
        step: step,
        taken_time: takenTime,
        result: result,
        payload: {
          service: this.constructor.name,
          user_id: payload?.account ? new IAccount(payload.account) : '-',
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
