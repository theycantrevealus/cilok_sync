import { InjectQueue } from '@nestjs/bull';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import mongoose, { Model, Types } from 'mongoose';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { Channel, ChannelDocument } from '@/channel/models/channel.model';

import { ProgramAddDTO, ProgramAddDTOResponse } from '../dto/program.add.dto';
import { ProgramDeleteDTOResponse } from '../dto/program.delete.dto';
import {
  ProgramEditDTO,
  ProgramEditDTOResponse,
} from '../dto/program.edit.dto';
import {
  ProgramBlacklist,
  ProgramBlacklistDocument,
} from '../models/program.blacklist.model';
import { Program, ProgramDocument } from '../models/program.model';
import {
  ProgramNotification,
  ProgramNotificationDocument,
} from '@/program/models/program.notification.model.v2';
import {
  ProgramSegmentation,
  ProgramSegmentationDocument,
} from '../models/program.segmentation.model';
import {
  ProgramTemplist,
  ProgramTemplistDocument,
} from '../models/program.templist.model';
import {
  ProgramWhitelist,
  ProgramWhitelistDocument,
} from '../models/program.whitelist.model';
import {KeywordType, KeywordTypeDocument, KeywordTypeEnum} from "@/keyword/models/keyword.type";

@Injectable()
export class ProgramService {
  protected importWBListQueue: Queue;

  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,

    @InjectModel(ProgramSegmentation.name)
    private programSegmentationModel: Model<ProgramSegmentationDocument>,

    @InjectModel(ProgramNotification.name)
    private programNotificationModel: Model<ProgramNotificationDocument>,

    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,

    @InjectModel(ProgramTemplist.name)
    private programTempListModel: Model<ProgramTemplistDocument>,

    @InjectModel(ProgramWhitelist.name)
    private programWModel: Model<ProgramWhitelistDocument>,

    @InjectModel(ProgramBlacklist.name)
    private programBModel: Model<ProgramBlacklistDocument>,

    @InjectModel(KeywordType.name)
    private keywordType: Model<KeywordTypeDocument>,

    @InjectQueue('program') importWBListQueue: Queue,
  ) {
    this.importWBListQueue = importWBListQueue;
  }

  async addProgramListTemp(fileData: LocalFileDto, type: string, ip: string) {
    const channel = await this.channelModel.findOne({ ip: ip }).exec();
    return this.importWBListQueue
      .add(
        'program-list',
        {
          channel: channel,
          type: type,
          list: fileData,
        },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      });
  }

  async deleteProgramTempList(
    param: string,
  ): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programTempListModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program temp list deleted successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Program temp list failed to deleted';
    }
    return response;
  }

  async addProgram(
    programData: ProgramAddDTO,
    ip: string,
  ): Promise<ProgramAddDTOResponse> {
    const channel = await this.channelModel.findOne({ ip: ip }).exec();
    const check = await this.checkUniqueProgram({ name: programData.name });
    const response = new ProgramAddDTOResponse();
    if (check) {
      if (
        programData.program_parent === null ||
        programData.program_parent === ''
      ) {
        delete programData.program_parent;
      }

      const newProgram = new this.programModel(programData);
      const process = await newProgram.save().then(async (returning) => {
        return returning;
      });

      if (process) {
        this.importWBListQueue.add(
          'program-process-list',
          {
            channel: channel._id,
            program: newProgram._id,
          },
          { removeOnComplete: true },
        );

        if (programData.program_notification.length > 0) {
          programData.program_notification.map(async (notificationData) => {
            if (notificationData.program === null) {
              delete notificationData.program;
            }

            const newNotification = new this.programNotificationModel({
              program: newProgram._id,
              ...notificationData,
            });

            await newNotification.save().then(async (returning) => {
              return returning;
            });
          });
        }

        const newKeywordType = new this.keywordType({
          "name": programData.name,
          "type": KeywordTypeEnum.REGISTRATION,
          "program": newProgram._id,
        });
        await newKeywordType.save();

        response.message = 'Program created successfully';
        response.status = HttpStatus.OK;
        response.payload = newProgram;
      } else {
        response.message = 'Program failed to created';
        response.status = 400;
        response.payload = process;
      }
    } else {
      response.message = 'Duplicate program names are not allowed';
      response.status = 400;
      response.payload = check;
    }

    return response;
  }

  async deleteProgramSegmentation(
    param: string,
  ): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programSegmentationModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Bonus Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Program Bonus Failed to Deleted';
    }
    return response;
  }

  async deleteProgramNotification(
    param: string,
  ): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programNotificationModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Notification Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Program Notification Failed to Deleted';
    }
    return response;
  }

  async editProgram(
    data: ProgramEditDTO,
    param: string,
  ): Promise<ProgramEditDTOResponse> {
    const process = await this.programModel
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(param) },
        {
          updated_at: Date.now(),
          ...data,
        },
      )
      .then((results) => {
        return results;
      });

    const response = new ProgramEditDTOResponse();
    if (process) {
      // data.program_segmentation.map(async (segmentationData) => {
      //   const checkIfExist = await this.programSegmentationModel
      //     .findOne({
      //       $and: [{ program: process._id }],
      //     })
      //     .exec();

      //   if (checkIfExist) {
      //     await this.programSegmentationModel
      //       .findOneAndUpdate(
      //         { _id: checkIfExist._id },
      //         {
      //           updated_at: Date.now(),
      //           deleted_at: null,
      //           ...segmentationData,
      //         },
      //       )
      //       .then((results) => {
      //         return results;
      //       });
      //   } else {
      //     const updateSegmentation = new this.programSegmentationModel({
      //       program: process._id,
      //       ...segmentationData,
      //     });

      //     await updateSegmentation.save().then(async (returning) => {
      //       return returning;
      //     });
      //   }
      // });

      if (data.program_notification.length > 0) {
        data.program_notification.map(async (notificationData) => {
          const checkIfExist = await this.programNotificationModel
            .findOne({
              $and: [
                { program: process._id },
                { notification: notificationData.notification },
                { via: notificationData.via },
                { receiver: notificationData.receiver },
              ],
            })
            .exec();

          if (checkIfExist) {
            await this.programNotificationModel
              .findOneAndUpdate(
                { _id: checkIfExist._id },
                {
                  updated_at: Date.now(),
                  deleted_at: null,
                  ...notificationData,
                },
              )
              .then((results) => {
                return results;
              });
          } else {
            const updateNotification = new this.programNotificationModel({
              program: process._id,
              ...notificationData,
            });

            await updateNotification.save().then(async (returning) => {
              return returning;
            });
          }
        });
      }

      response.message = 'Program Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Program Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deleteProgram(param: string): Promise<ProgramDeleteDTOResponse> {
    const process = await this.programModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new ProgramDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Program Failed to Deleted';
    }
    return response;
  }

  async findProgramById(param: any): Promise<any> {
    const data = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'programnotifications',
            let: { program_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$program', '$$program_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'via',
                  foreignField: '_id',
                  as: 'via_detail',
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'receiver',
                  foreignField: '_id',
                  as: 'receiver_detail',
                },
              },
              {
                $lookup: {
                  from: 'notificationtemplates',
                  localField: 'notification',
                  foreignField: '_id',
                  as: 'notification_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  program: false,
                  via: false,
                  receiver: false,
                },
              },
            ],
            as: 'program_notification',
          },
        },
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
    // const isValidObjectId = Types.ObjectId.isValid(param);
    // if (isValidObjectId) {
    //   const res = await this.programModel.findById(param).exec();
    //   if (res === null) {
    //     throw new HttpException(
    //       {
    //         status: 404,
    //         error: `Data with ID ${param} is not found`,
    //       },
    //       404,
    //     );
    //   } else {
    //     return res;
    //   }
    // } else {
    //   throw new HttpException(
    //     {
    //       status: 400,
    //       error: `ID ${param} is not valid format`,
    //     },
    //     400,
    //   );
    // }
  }

  async getProgramSelection(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort === '{}' || param.sort === ''
        ? { _id: 1 }
        : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'programbonus',
            let: { bonus_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$program', '$$bonus_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'bonus_type',
                  foreignField: '_id',
                  as: 'bonus_type_detail',
                },
              },
              {
                $lookup: {
                  from: 'locations',
                  localField: 'location',
                  foreignField: '_id',
                  as: 'location_detail',
                },
              },
              {
                $lookup: {
                  from: 'locationbuckets',
                  localField: 'bucket',
                  foreignField: '_id',
                  as: 'bucket_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  program: false,
                  bonus_type: false,
                  location: false,
                  bucket: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'program_bonus',
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

    return data;
  }

  async checkUniqueProgram(parameter: any) {
    return (await this.programModel.findOne(parameter).exec()) === null;
  }

  async getProgramTemp(param: any, ip: string): Promise<any> {
    // let channel = await this.channelModel.findOne({ ip: ip }).exec();
    // No need to re populate channel hit
    // if (channel === null) {
    //   const new_channel = new this.channelModel({
    //     code: 'UNDEFINED',
    //     ip: ip,
    //     name: 'UNDEFINED',
    //     description: 'UNDEFINED',
    //   });
    //   new_channel.save();
    //   channel = new_channel;
    // }

    const filter_set =
      param.filter && param.filter !== '' && param.filter !== '{}'
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {
      // channel: channel._id,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.programTempListModel.aggregate(
      [
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

  async getProgramWBlist(param: any, type: string, program: string) {
    const ProgramSet = await this.programModel.findOne({ _id: program }).exec();

    const filter_set =
      param.filter && param.filter !== '' && param.filter !== '{}'
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {
      program: ProgramSet._id,
      deleteddAt: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    let data: any;
    if (type === 'whitelist') {
      data = await this.programWModel.aggregate(
        [
          {
            $match: filter_builder,
          },
          { $sort: sort_set },
          { $skip: skip },
          { $limit: limit },
        ],
        (err, result) => {
          return result;
        },
      );
    } else {
      data = await this.programBModel.aggregate(
        [
          {
            $match: filter_builder,
          },
          { $sort: sort_set },
          { $skip: skip },
          { $limit: limit },
        ],
        (err, result) => {
          return result;
        },
      );
    }

    return {
      data: data,
      total: data.length,
    };
  }

  async getProgram(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' && param.filter !== '{}'
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'programnotifications',
            let: { program_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$program', '$$program_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'via',
                  foreignField: '_id',
                  as: 'via_detail',
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  localField: 'receiver',
                  foreignField: '_id',
                  as: 'receiver_detail',
                },
              },
              {
                $lookup: {
                  from: 'notificationtemplates',
                  localField: 'notification',
                  foreignField: '_id',
                  as: 'notification_detail',
                },
              },
              {
                $project: {
                  _id: false,
                  program: false,
                  via: false,
                  receiver: false,
                },
              },
            ],
            as: 'program_notification',
          },
        },
        {
          $match: filter_builder,
        },
        { $sort: sort_set },
        { $skip: skip },
        { $limit: limit },
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

  async getProgramWithExcept(param: any): Promise<any> {
    const except = param.except;
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
    filter_builder._id = { $ne: except };

    const data = this.programModel
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
}
