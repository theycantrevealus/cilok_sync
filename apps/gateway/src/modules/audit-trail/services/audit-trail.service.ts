import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GlobalResponse } from '@/dtos/response.dto';

import { CreateAuditTrailDto } from '../dtos/create-audit-trail.dto';
import { AuditTrail, AuditTrailDocument } from '../models/audit-trail.model';

export type IPrimeDataTable = {
  first: number;
  rows: number;
  sortField: string;
  sortOrder: number;
  filters: object;
};

@Injectable()
export class AuditTrailService {
  private readonly _transactionClassify = 'AUDIT_TRAIL';

  constructor(
    @InjectModel(AuditTrail.name)
    private auditTrailModel: Model<AuditTrailDocument>,
    @InjectModel(AuditTrail.name, 'secondary')
    private auditTrailModelSecondaryConnection: Model<AuditTrailDocument>,
  ) {}

  private filterBuilderPrimeDT(filters: object) {
    const pipeline = [];

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
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        } else if (filterSet[a].matchMode === 'in') {
          delete autoColumn[a];

          filter_builder['$or'] = filterSet[a].value.map((value: string) => ({
            additional_param: {
              $regex: new RegExp(`${value}`, 'i'),
            },
          }));
        } else if (filterSet[a].matchMode === 'between') {
          autoColumn[a] = {
            $gte: new Date(
              new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).setDate(
                new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).getDate() -
                  1,
              ),
            ),
            $lte: new Date(`${filterSet[a].value[1]}T16:59:59.000Z`),
          };
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      pipeline.push({
        $match: filter_builder,
      });
    } else {
      pipeline.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    return pipeline;
  }

  public async createAuditTrail(
    createAuditTrailDto: CreateAuditTrailDto,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = this._transactionClassify;
    console.log('createAuditTrailDto', createAuditTrailDto);

    try {
      const auditTrail = await this.auditTrailModel.create(createAuditTrailDto);
      response.message = 'Create success';
      response.payload = auditTrail;

      return response;
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: error.status,
        message: error.message,
        errorCode: response.transaction_classify,
        errorDetails: error,
      });
    }
  }

  public async getAuditTrails(queryParams: IPrimeDataTable): Promise<any> {
    const { first, rows, sortField, sortOrder, filters } = queryParams;
    const sort_set = {};

    try {
      const pipelineTotalRecords = this.filterBuilderPrimeDT(filters);
      const pipelineData = [...pipelineTotalRecords];

      if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
        if (sort_set[sortField] === undefined) {
          sort_set[sortField] = sortOrder;
        }

        pipelineData.push({
          $sort: sort_set,
        });
      }

      pipelineData.push({ $skip: first });

      pipelineData.push({ $limit: rows });

      const [totalRecords, data] = await Promise.all([
        this.auditTrailModelSecondaryConnection.aggregate(pipelineTotalRecords),
        this.auditTrailModelSecondaryConnection.aggregate(pipelineData),
      ]);

      return {
        message: HttpStatus.OK,
        payload: {
          totalRecords: totalRecords.length,
          data: data,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException({
        statusCode: error.status,
        message: error.message,
        errorCode: this._transactionClassify,
        errorDetails: error,
      });
    }
  }
}
