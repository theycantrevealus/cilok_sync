import {
  BadRequestException,
  CACHE_MANAGER,
  CacheStore,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { Model, PipelineStage, Types } from 'mongoose';

import { GlobalErrorResponse } from '@/dtos/response.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import {
  BidAddDTO,
  BidAddDTOResponse,
} from '@/transaction/dtos/bid/bid.add.dto';
import { BidDeleteDTOResponse } from '@/transaction/dtos/bid/bid.delete.dto';
import {
  BidEditDTO,
  BidEditDTOResponse,
} from '@/transaction/dtos/bid/bid.edit.dto';
import { Bid, BidDocument } from '@/transaction/models/bid/bid.model';
interface FilterParams {
  first?: number;
  rows?: number;
  sortField?: string;
  sortOrder?: number;
  filters?: Record<string, { value: any; matchMode: string }>;
}

@Injectable()
export class BidService {
  constructor(
    @InjectModel(Bid.name) private bidModel: Model<BidDocument>,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    //
  }

  private buildFilterQuery(
    filters: Record<string, { value: any; matchMode: string }> | undefined,
  ) {
    const filter_builder = { $and: [] };

    if (!filters) return { $and: [{ deleted_at: null }] };

    // Process all filters
    for (const [field, filter] of Object.entries(filters)) {
      if (!field || !filter.value || filter.value === '') {
        continue;
      }

      // Handle date filters
      if (field === 'start_date' || field === 'end_date') {
        const dateConditions: any = {};

        if (field === 'start_date') {
          dateConditions.start_date = {
            $gte: new Date(filter.value),
          };
          filter_builder.$and.push(dateConditions);
        }

        if (field === 'end_date') {
          // Skip end_date filter if start_date is not provided
          if (!filters.start_date?.value) continue;

          dateConditions.end_date = {
            $lte: new Date(filter.value),
          };
          filter_builder.$and.push(dateConditions);
        }
        continue;
      }

      // Handle other filters
      const condition: any = {};

      switch (filter.matchMode) {
        case 'contains':
          condition[field] = {
            $regex: new RegExp(filter.value, 'i'),
          };
          break;
        case 'notContains':
          condition[field] = {
            $not: { $regex: new RegExp(filter.value, 'i') },
          };
          break;
        case 'endsWith':
          condition[field] = {
            $regex: new RegExp(`${filter.value}$`, 'i'),
          };
          break;
        case 'equals':
          condition[field] = { $eq: filter.value };
          break;
        case 'notEquals':
          condition[field] = { $ne: filter.value };
          break;
      }

      if (Object.keys(condition).length > 0) {
        filter_builder.$and.push(condition);
      }
    }

    // Add default deleted_at filter
    filter_builder.$and.push({ deleted_at: null });

    return filter_builder;
  }

  async getBidPrime(param: FilterParams): Promise<any> {
    try {
      const {
        first = 0,
        rows = 20,
        sortField = 'created_at',
        sortOrder = -1,
        filters,
      } = param;

      const pipeline: PipelineStage[] = [
        // Lookup untuk point_type
        {
          $lookup: {
            from: 'lovs',
            foreignField: '_id',
            localField: 'point_type',
            as: 'point_type_detail',
          },
        } as PipelineStage,
        {
          $unwind: {
            path: '$point_type_detail',
            preserveNullAndEmptyArrays: true,
          },
        } as PipelineStage,
        // Lookup untuk keyword
        {
          $lookup: {
            from: 'keywords',
            foreignField: '_id',
            localField: 'keyword',
            as: 'keyword_detail',
          },
        } as PipelineStage,
        {
          $unwind: {
            path: '$keyword_detail',
            preserveNullAndEmptyArrays: true,
          },
        } as PipelineStage,
        // Apply filters
        {
          $match: this.buildFilterQuery(filters),
        } as PipelineStage,
      ];

      // Get total count before pagination
      const countPipeline = [...pipeline, { $count: 'total' } as PipelineStage];
      const totalRecords = await this.bidModel
        .aggregate(countPipeline)
        .then((result) => result[0]?.total || 0);

      // Add sorting
      if (sortField) {
        pipeline.push({
          $sort: { [sortField]: sortOrder },
        } as PipelineStage);
      }

      // Add pagination
      pipeline.push(
        { $skip: first } as PipelineStage,
        { $limit: rows } as PipelineStage,
      );

      // Execute final query
      const data = await this.bidModel.aggregate(pipeline);

      return {
        message: HttpStatus.OK,
        payload: {
          totalRecords,
          data,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  //PrimeOld
  // async getBidPrime(param): Promise<any> {
  //   const first = param.first ? parseInt(param.first) : 0;
  //   const rows = param.rows ? parseInt(param.rows) : 20;
  //   const sortField = param.sortField ? param.sortField : 'created_at';
  //   const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
  //   const filters = param.filters;
  //   const query: any[] = [
  //     {
  //       $lookup: {
  //         from: 'lovs',
  //         foreignField: '_id',
  //         localField: 'point_type',
  //         as: 'point_type_detail',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$point_type_detail',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'keywords',
  //         foreignField: '_id',
  //         localField: 'keyword',
  //         as: 'keyword_detail',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$keyword_detail',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $match: {
  //         $and: [{ deleted_at: null }],
  //       },
  //     },
  //   ];
  //   const sort_set = {};

  //   const filter_builder = { $and: [] };
  //   const filterSet = filters;
  //   for (const a in filterSet) {
  //     if (
  //       a &&
  //       a !== '' &&
  //       filterSet[a].value !== '' &&
  //       filterSet[a].value !== null
  //     ) {
  //       const autoColumn = {};
  //       if (autoColumn[a] === undefined) {
  //         autoColumn[a] = {};
  //       }

  //       if (filterSet[a].matchMode === 'contains') {
  //         autoColumn[a] = {
  //           $regex: new RegExp(`${filterSet[a].value}`, 'i'),
  //         };
  //       } else if (filterSet[a].matchMode === 'notContains') {
  //         autoColumn[a] = {
  //           $not: {
  //             $regex: new RegExp(`${filterSet[a].value}`, 'i'),
  //           },
  //         };
  //       } else if (filterSet[a].matchMode === 'endsWith') {
  //         autoColumn[a] = {
  //           $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
  //         };
  //       } else if (filterSet[a].matchMode === 'equals') {
  //         autoColumn[a] = {
  //           $eq: filterSet[a].value,
  //         };
  //       } else if (filterSet[a].matchMode === 'notEquals') {
  //         autoColumn[a] = {
  //           $not: {
  //             $eq: filterSet[a].value,
  //           },
  //         };
  //       }

  //       filter_builder.$and.push(autoColumn);
  //     }
  //   }

  //   if (filter_builder.$and.length > 0) {
  //     query.push({
  //       $match: filter_builder,
  //     });
  //   } else {
  //     query.push({
  //       $match: {
  //         $and: [{ deleted_at: null }],
  //       },
  //     });
  //   }

  //   const allNoFilter = await this.bidModel.aggregate(query, (err, result) => {
  //     return result;
  //   });

  //   query.push({ $skip: first });

  //   query.push({ $limit: rows });

  //   if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
  //     if (sort_set[sortField] === undefined) {
  //       sort_set[sortField] = sortOrder;
  //     }

  //     query.push({
  //       $sort: sort_set,
  //     });
  //   }

  //   const data = await this.bidModel.aggregate(query, (err, result) => {
  //     return result;
  //   });

  //   return {
  //     message: HttpStatus.OK,
  //     payload: {
  //       totalRecords: allNoFilter.length,
  //       data: data,
  //     },
  //   };
  // }

  async getBid(param: any): Promise<{
    data: object[];
    total: number;
  }> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set = param.sort === '{}' ? { _id: 1 } : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: object = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = ['_id', 'point_type', 'keyword'].includes(a)
        ? new Types.ObjectId(filter_set[a])
        : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.bidModel.aggregate(
      [
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
        {
          $lookup: {
            from: 'lovs',
            foreignField: '_id',
            localField: 'point_type',
            as: 'point_type_detail',
          },
        },
        {
          $unwind: {
            path: '$point_type_detail',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'keywords',
            foreignField: '_id',
            localField: 'keyword',
            as: 'keyword_detail',
          },
        },
        {
          $unwind: {
            path: '$keyword_detail',
            preserveNullAndEmptyArrays: true,
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

  async detailBid(_id: string): Promise<object> {
    try {
      const data = await this.bidModel.aggregate(
        [
          {
            $match: {
              $and: [{ _id: new Types.ObjectId(_id) }, { deleted_at: null }],
            },
          },
          {
            $lookup: {
              from: 'lovs',
              foreignField: '_id',
              localField: 'point_type',
              as: 'point_type_detail',
            },
          },
          {
            $unwind: {
              path: '$point_type_detail',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'keywords',
              foreignField: '_id',
              localField: 'keyword',
              as: 'keyword_detail',
            },
          },
          {
            $unwind: {
              path: '$keyword_detail',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      if (data.length == 0) {
        const response = new GlobalErrorResponse();
        response.statusCode = HttpStatus.NOT_FOUND;
        response.message = ['Bid not found.'];
        return response;
      }

      return data[0];
    } catch (err) {
      const response = new GlobalErrorResponse();
      response.statusCode = HttpStatus.BAD_REQUEST;
      response.message = [err.message];
      return response;
    }
  }

  //Add Old & Edit OLD
  // async addBid(data: BidAddDTO): Promise<BidAddDTOResponse> {
  // const response = new BidAddDTOResponse();

  //   // Point Type Validation
  //   const pointTypeCount = await this.lovModel.count({
  //     _id: data.point_type,
  //     group_name: 'POINT_TYPE',
  //   });
  //   if (data?.point_type && pointTypeCount === 0) {
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message = 'Point Type from lov is not found.';
  //     response.payload = data;
  //     return response;
  //   }

  //   // Keyword Validation
  //   const keywordCount = await this.keywordModel.count({
  //     _id: data.keyword,
  //   });
  //   if (!data?.keyword && keywordCount === 0) {
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message = 'Keyword is not found.';
  //     response.payload = data;
  //     return response;
  //   }

  //   // Check uniqueness of external_product_id and contract
  //   const bidCount = await this.bidModel.count({
  //     external_product_id: data.external_product_id,
  //     contract: data.contract,
  //   });
  //   if (data?.external_product_id && data.contract && bidCount > 0) {
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message = 'External Product Id and Contract must be unique.';
  //     response.payload = data;
  //     return response;
  //   }

  //   // Validation: default_earning true can only be set for one bid
  //   const bidEarningCount = await this.bidModel.count({
  //     external_product_id: data.external_product_id,
  //     default_earning: true,
  //   });
  //   if (
  //     data?.external_product_id &&
  //     data?.default_earning &&
  //     bidEarningCount > 0
  //   ) {
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message = 'Default earning is already set in another bid.';
  //     response.payload = data;
  //     return response;
  //   }

  //   try {
  //     // Save new bid to the database
  //     const newBid = new this.bidModel(data);
  //     const process = await newBid.save();

  //     // If save is successful
  //     response.status = HttpStatus.OK;
  //     response.message = 'Bid Created Successfully';
  //     response.payload = process; // Return the created bid in the payload
  //   } catch (error) {
  //     // If save fails
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message = 'Bid Failed to Create';
  //     response.payload = error; // You can include the error message if needed
  //   }

  //   return response;
  // }

  // async editBid(data: BidEditDTO, _id: string): Promise<BidEditDTOResponse> {
  //   const response = new BidEditDTOResponse();

  //   // Point Type Validation
  //   const pointTypeCount = await this.lovModel.count({
  //     _id: data.point_type,
  //     group_name: 'POINT_TYPE',
  //   });
  //   if (data?.point_type && pointTypeCount == 0) {
  //     response.message = 'Point Type from lov is not found.';
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.payload = data;
  //     return response;
  //   }

  //   // Keyword Validation
  //   const keywordCount = await this.keywordModel.count({
  //     _id: data.keyword,
  //   });
  //   if (keywordCount == 0) {
  //     response.message = 'Keyword is not found.';
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.payload = data;
  //     return response;
  //   }

  //   //validation default_earning true only set 1 bid
  //   const bidEarningCount = await this.bidModel.count({
  //     _id: { $ne: new Types.ObjectId(_id) }, // Pastikan _id yang bukan id yang di-edit
  //     external_product_id: data.external_product_id,
  //     default_earning: true,
  //   });

  //   if (
  //     data?.external_product_id &&
  //     data?.default_earning &&
  //     bidEarningCount > 0
  //   ) {
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.message =
  //       'Default earning is already set in another bid for this external product.';
  //     response.payload = data;
  //     return response;
  //   }

  //   const process = await this.bidModel
  //     .findOneAndUpdate(
  //       { _id: _id, deleted_at: null },
  //       {
  //         external_product_id: data.external_product_id,
  //         point: data.point,
  //         point_type: data.point_type,
  //         keyword: data.keyword,
  //         contract: data.contract,
  //         status: data.status,
  //         tracing_id: data.tracing_id,
  //         tracing_inject: data.tracing_inject,
  //         type: data.type,
  //         start_date: data?.start_date,
  //         end_date: data?.end_date,
  //         tier_multiplier: data?.tier_multiplier,
  //         special_multiplier: data?.special_multiplier,
  //         special_multiplier_value: data?.special_multiplier_value,
  //         default_earning: data?.default_earning,
  //         keyword_name: data?.keyword_name,
  //         updated_at: Date.now(),
  //       },
  //       { new: true },
  //     )
  //     .exec();

  //   await this.removeBidInRedis(_id);

  //   if (process) {
  //     response.message = 'Bid Updated Successfully';
  //     response.status = HttpStatus.OK;
  //     response.payload = process;
  //   } else {
  //     response.message = 'Bid Failed to Updated';
  //     response.status = HttpStatus.BAD_REQUEST;
  //     response.payload = process;
  //   }
  //   return response;
  // }

  private async validatePointType(pointType: any): Promise<void> {
    if (!pointType) return;
    
    const pointTypeCount = await this.lovModel.count({
      _id: pointType,
      group_name: 'POINT_TYPE',
    });
    
    if (pointTypeCount === 0) {
      throw new BadRequestException('Point Type from lov is not found.');
    }
  }

  private async validateKeyword(keywordId: any): Promise<void> {
    if (!keywordId) return;
    
    const keywordCount = await this.keywordModel.count({ _id: keywordId });
    if (keywordCount === 0) {
      throw new BadRequestException('Keyword is not found.');
    }
  }

  private async validateUniqueBid(externalProductId: string, contract: any): Promise<void> {
    if (!externalProductId || !contract) return;

    const bidCount = await this.bidModel.count({
      external_product_id: externalProductId,
      contract: contract,
    });
    
    if (bidCount > 0) {
      throw new BadRequestException('External Product Id and Contract must be unique.');
    }
  }

  private async validateDefaultEarning(
    externalProductId: string, 
    defaultEarning: boolean,
    excludeId?: string
  ): Promise<void> {
    if (!externalProductId || !defaultEarning) return;

    const query: any = {
      external_product_id: externalProductId,
      default_earning: true,
    };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const bidEarningCount = await this.bidModel.count(query);
    
    if (bidEarningCount > 0) {
      throw new BadRequestException('Default Earning has been set for this BID. Please check other BID Config(s)');
    }
  }

  async addBid(data: BidAddDTO): Promise<any> {
    try {
      const response = new BidAddDTOResponse();

      // Run all validations
      await Promise.all([
        this.validatePointType(data.point_type),
        this.validateKeyword(data.keyword),
        this.validateUniqueBid(data.external_product_id, data.contract),
        this.validateDefaultEarning(data.external_product_id, data.default_earning)
      ]);

      // Save new bid
      const newBid = new this.bidModel(data);
      const savedBid = await newBid.save();

      // Clear Redis cache
      await this.removeBidInRedis(savedBid?._id);

      response.status = HttpStatus.CREATED;
      response.message = 'Bid Created Successfully';
      response.payload = savedBid; // Return the created bid in the payload

      return response;

    } catch (error) {
      // For other errors, throw a new BadRequestException
      throw new BadRequestException([
        { isInvalidDataContent: error?.message ? error?.message : 'Bid Failed to Create' },
      ]);
    }
  }

  async editBid(data: BidAddDTO, _id: string): Promise<any> {
    try {
      const response = new BidAddDTOResponse();

      // Run all validations
      await Promise.all([
        this.validatePointType(data.point_type),
        this.validateKeyword(data.keyword),
        this.validateDefaultEarning(data.external_product_id, data.default_earning, _id)
      ]);

      const updatedBid = await this.bidModel.findOneAndUpdate(
        { _id, deleted_at: null },
        {
          ...data,
          updated_at: Date.now()
        },
        { new: true }
      ).exec();

      if (!updatedBid) {
        throw new BadRequestException('Bid not found or already deleted');
      }

      // Clear Redis cache
      await this.removeBidInRedis(_id);

      response.message = 'Bid Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = updatedBid;
      return response;

    } catch (error) {
      // For other errors, throw a new BadRequestException
      throw new BadRequestException([
        { isInvalidDataContent: error?.message ? error?.message : 'Bid Failed to Update' },
      ]);
    }
  }
  
  async deleteBid(_id: string): Promise<BidDeleteDTOResponse> {
    const [process] = await Promise.all([
      this.bidModel
        .findOneAndUpdate(
          { _id: _id, deleted_at: null },
          { deleted_at: Date.now() },
        )
        .exec(),
      this.removeBidInRedis(_id),
    ]);

    const response = new BidDeleteDTOResponse();
    if (process) {
      response.message = 'Bid Deleted Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Bid Failed to Deleted';
      response.status = HttpStatus.BAD_REQUEST;
      response.payload = process;
    }
    return response;
  }

  private async removeBidInRedis(id: string): Promise<void> {
    const existingBid = await this.bidModel.findById(id);

    if (!existingBid) {
      return;
    }

    const bidRedisKey = `${RedisDataKey.BID_KEY}-${existingBid.external_product_id}`;

    console.log('=== REMOVE BID RUN ===', bidRedisKey)
    await this.cacheManager.del(bidRedisKey);
  }

}
