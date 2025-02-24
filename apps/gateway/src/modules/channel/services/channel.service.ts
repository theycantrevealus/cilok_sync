import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, Types } from 'mongoose';

import { ChannelAddDTO, ChannelAddDTOResponse } from '../dto/channel.add.dto';
import { ChannelDeleteDTOResponse } from '../dto/channel.delete.dto';
import {
  ChannelEditDTO,
  ChannelEditDTOResponse,
} from '../dto/channel.edit.dto';
import { Channel, ChannelDocument } from '../models/channel.model';

@Injectable()
export class ChannelService {
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
  ) {
    //
  }

  async repopulateChannel(param: string): Promise<Channel> {
    let currentChannelSession: any = await this.channelModel
      .findOne({ ip: param })
      .exec();
    if (!currentChannelSession) {
      await new this.channelModel({
        code: 'UNDEFINED',
        ip: param,
        name: 'UNDEFINED',
        description: 'UNDEFINED',
      }).save(async (err, result) => {
        currentChannelSession = result._id;
        return result;
      });
    } else {
      return currentChannelSession._id;
    }
  }

  async detailCode(code: string): Promise<Channel> {
    try {
      const channel = await this.channelModel.findOne({ code }).exec();

      if (!channel) {
        return null;
      }
      return channel;
    } catch (error) {
      throw new Error(`Error fetching channel : ${error.message}`);
    }
  }

  async detail(param: any): Promise<Channel> {
    try {
      if (!Types.ObjectId.isValid(param)) {
        return null;
      }

      const channel = await this.channelModel.findById(param).exec();

      if (!channel) {
        return null;
      }
      return channel;
    } catch (error) {
      throw new Error(`Error fetching channel : ${error.message}`);
    }
  }

  async getChannel(param: any): Promise<any> {
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

    const data = this.channelModel
      .find(filter_builder)
      .find({
        $where: function () {
          return this.code !== 'UNDEFINED';
        },
      })
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

  async getChannelPrime(param: any): Promise<any> {
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
          $and: [{ deleted_at: null }, { code: { $ne: 'UNDEFINED' } }],
        },
      });
    }

    const allNoFilter = await this.channelModel.aggregate(
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

    const data = await this.channelModel.aggregate(query, (err, result) => {
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

  async addChannel(channelData: ChannelAddDTO): Promise<ChannelAddDTOResponse> {
    const newChannel = new this.channelModel(channelData);
    const process = newChannel.save().then(async (returning) => {
      return await returning;
    });

    const response = new ChannelAddDTOResponse();
    if (process) {
      response.message = 'Channel Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Channel Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async editChannel(
    data: ChannelEditDTO,
    param: string,
  ): Promise<ChannelEditDTOResponse> {
    const process = this.channelModel
      .findOneAndUpdate(
        { _id: param },
        {
          code: data.code,
          ip: data.ip,
          name: data.name,
          description: data.description,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new ChannelEditDTOResponse();
    if (process) {
      response.message = 'Channel Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Channel Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deleteChannel(param: string): Promise<ChannelDeleteDTOResponse> {
    const process = this.channelModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new ChannelDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Channel Deleted Successfully';
    } else {
      response.status = 400;
      response.message = 'Channel Failed to Deleted';
    }
    return response;
  }

  async findOneChannel(params: any) {
    const data = await this.channelModel.findOne(params);
    return data;
  }

  async getChannelMyTelkomsel(code: any) {
    let response: any = {
      data: null,
      status: false,
      msg: "Fail get channel",
    }

    try {
      if (code) {
        let channel = await this.findOneChannel({ name: /MyTelkomsel/, code: code });
        if (channel) {
          response.data = channel;
          response.status = true;
          response.msg = "success get channel"
        }
      }
      return response;
    } catch (error) {
      response.msg = error;
      return response;
    }
  }

}
