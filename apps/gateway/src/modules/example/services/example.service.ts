import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Error, Model } from 'mongoose';
import { Command } from 'nestjs-command';

import { Account } from '@/account/models/account.model';
import { ExampleResponse } from '@/example/dtos/response.dto';
import {
  ExampleJoinv2,
  ExampleJoinv2Document,
} from '@/example/models/example.join.v2';
import { Example, ExampleDocument } from '@/example/models/example.model';
import {
  Examplev2,
  Examplev2Document,
} from '@/example/models/example.v2.model';

@Injectable()
export class ExampleService {
  constructor(
    @InjectModel(Example.name) private exampleModel: Model<ExampleDocument>,
    @InjectModel(Examplev2.name)
    private examplev2Model: Model<Examplev2Document>,
    @InjectModel(ExampleJoinv2.name)
    private exampleJoinv2Model: Model<ExampleJoinv2Document>,
    @Inject('REPORTING_SERVICE_PRODUCER')
    private readonly clientReporting: ClientKafka,
  ) {
    //
  }

  @Command({
    command: 'create:example',
    describe: 'seed data example',
  })
  async seed() {
    //
  }

  async all(param): Promise<unknown> {
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
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
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

    const allNoFilter = await this.exampleModel.aggregate(
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

    const data = await this.exampleModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async all2(param): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $lookup: {
        from: 'examplejoinv2',
        let: { foreign_example: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$examplev2', '$$foreign_example'] }],
              },
            },
          },
          {
            $project: {
              __v: false,
              created_by: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'example_item',
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
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
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

    const allNoFilter = await this.examplev2Model.aggregate(
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

    const data = await this.examplev2Model.aggregate(query, (err, result) => {
      // call reporting kafka services

      const payload = {
        // origin: 'redeem',
        // program: {},
        // keyword: {},
        // customer: {},
        // endpoint: {},
        // tracing_id: {},
        // incoming: {},
        // account: {},
        // token: {},
        // payload: {
        //   reporting: {
        //     unique_msisdn: {
        //       period: param.period,
        //       msisdn: param.msisdn,
        //     },
        //     earning: {},
        //   },
        // },
        payload: {
          reporting: {
            data: {
              period: param.period,
              poin_owner: {},
              gross_revenue: {},
              poin_earned: {},
              redeemer_existing: {},
              reward_live_system: {},
              reward_trx: {},
              program: {},
              redeemer: {
                period: param.period,
                msisdn: param.msisdn,
                // optional
                config: {
                  action: false,
                  method: 'email',
                  data_type: 'html',
                  query: `db.find({period: $param.period})`,
                  template_notif: '',
                },
              },
              gross_revenue_redeemer: {},
              poin_earned_redeemer: {},
              poin_burning: {},
              trx_burn: {},
              redeemer_mytelkomsel: {},
              gross_revenue_redeemer_mytelkomsel: {},
              poin_earned_redeemer_mytelkomsel: {},
              poin_burning_mytelkomsel: {},
              trx_burn_mytelkomsel: {},
            },
            config: {
              action: true,
              method: 'email',
              data_type: 'html',
              query: `db.find({period: payload.,}).then((res) => { console.log('Report Monitoring Find :' + res);return res;});`,
              template_notif: '',
            },
          },
        },
      };
      this.clientReporting.emit('reporting', payload);
      console.log(payload);
      return payload;

      // return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async add(request: Example, account: Account): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'ADD_EXAMPLE';
    const newData = new this.exampleModel({
      ...request,
      created_by: account,
    });
    return await newData
      .save()
      .catch((e: Error) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(() => {
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data add success';
        response.payload = newData;
        return response;
      });
  }

  async addv2(request: Examplev2, account: Account): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'ADD_EXAMPLE';
    response.payload = request;
    const newData = new this.examplev2Model({
      ...request,
      created_by: account,
    });

    newData.save(async (e, data) => {
      if (e) {
        // throw new Error(e.message);
        console.log(e);
      } else {
        if (request.example_join_v2.length > 0) {
          request.example_join_v2.map(async (e) => {
            const newJoin = new this.exampleJoinv2Model({
              ...e,
              examplev2: data._id,
            });
            await newJoin.save();
          });
        }
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data add success';
      }
    });
    return response;
  }

  async edit(_id: string, request: Example): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'EDIT_EXAMPLE';

    await this.exampleModel
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
        },
        {
          ...request,
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(() => {
        response.statusCode = HttpStatus.OK;
        response.message = 'Data edit success';
      });
    return response;
  }

  async editv2(_id: string, request: Examplev2): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'EDIT_EXAMPLE';
    response.payload = request;
    await this.examplev2Model
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
        },
        {
          ...request,
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(async (data: any) => {
        if (request.example_join_v2.length > 0) {
          await this.exampleJoinv2Model
            .deleteMany({
              examplev2: data._id,
            })
            .then(() => {
              request.example_join_v2.map(async (e) => {
                const newJoin = new this.exampleJoinv2Model({
                  ...e,
                  examplev2: data._id,
                });
                await newJoin.save();
              });
            });
        }
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data edit success';
      });
    return response;
  }

  async delete(_id: string, soft = true): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      await this.exampleModel
        .findOneAndUpdate(
          {
            _id: oid,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(() => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
        });
    } else {
      await this.exampleModel
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
        });
    }

    return response;
  }

  async deletev2(_id: string, soft = true): Promise<ExampleResponse> {
    const response = new ExampleResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      await this.examplev2Model
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
        .then(() => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
        });
    } else {
      await this.examplev2Model
        .findOneAndDelete({
          _id: new mongoose.Types.ObjectId(_id),
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(async () => {
          await this.exampleJoinv2Model
            .deleteMany({
              examplev2: oid,
            })
            .then(() => {
              response.statusCode = HttpStatus.NO_CONTENT;
              response.message = 'Data delete success';
            });
        });
    }

    return response;
  }
}
