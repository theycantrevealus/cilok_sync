import { InjectQueue } from '@nestjs/bull';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import mongoose, { Model, Types } from 'mongoose';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
const moment = require('moment-timezone');

@Injectable()
export class ProgramServiceV3 {
  protected importWBListQueue: Queue;

  constructor(
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,

    @InjectQueue('program') importWBListQueue: Queue,

  ) {
    this.importWBListQueue = importWBListQueue;
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
              // {
              //   $lookup: {
              //     from: 'lovs',
              //     localField: 'via',
              //     foreignField: '_id',
              //     as: 'via_detail',
              //   },
              // },
              {
                $project: {
                  via: {
                    $map: {
                      input: '$via',
                      as: 'via_detail',
                      in: {
                        $toObjectId: '$$via_detail',
                      },
                    },
                  },
                  notif_type: true,
                  template: true,
                  template_content: true,
                },
              },
              {
                $lookup: {
                  from: 'lovs',
                  let: { via_id: '$via' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $in: ['$_id', '$$via_id'],
                        },
                      },
                    },
                  ],
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
                  program: false,
                  // via: false,
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
  }
}
