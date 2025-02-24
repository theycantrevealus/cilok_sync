import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
const moment = require('moment-timezone');
import { Types } from 'mongoose';

import {
  CheckRedeem,
  CheckRedeemDocument,
} from '@/transaction/models/redeem/check.redeem.model';
import {
  MaxRedeemThresholds,
  MaxRedeemThresholdsDocument,
} from '@/transaction/models/redeem/max_redeem.treshold.model';

@Injectable()
export class MaxRedeemTresholdsService {
  constructor(
    @InjectModel(MaxRedeemThresholds.name)
    private maxRedeemTresholdsModel: Model<MaxRedeemThresholdsDocument>,
    @InjectModel(CheckRedeem.name)
    private checkRedeem: Model<CheckRedeemDocument>,
  ) { }

  async maxRedeemTresholdsCreate(data: MaxRedeemThresholds): Promise<any> {
    try {
      const newMaxRedeemThreshold = new this.maxRedeemTresholdsModel({
        ...data,
        created_at: new Date(), // Set created_at to the current date/time
        updated_at: new Date(), // Set updated_at to the current date/time
        deleted_at: null, // Assuming deleted_at should be initially set to null
      });

      const result = await newMaxRedeemThreshold.save();
      console.log('=== CHECK MAX REDEEM RESULT ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error creating MaxRedeemThreshold:', error);
      throw new Error('Failed to create MaxRedeemThreshold');
    }
  }

  async maxRedeemThresholdsFindOne(
    keyword_id: string,
    keyword: string,
  ): Promise<MaxRedeemThresholds | null> {
    try {
      const result = await this.maxRedeemTresholdsModel
        .findOne({ keyword_id: keyword_id, keyword: keyword })
        .exec();
      console.log('=== CHECK MAX REDEEM RESULT FIND ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error finding MaxRedeemThreshold:', error);
      throw new Error('Failed to find MaxRedeemThreshold');
    }
  }

  async maxRedeemThresholdsUpdate(
    keyword_id: string,
    keyword: string,
    data: Partial<MaxRedeemThresholds>,
  ): Promise<MaxRedeemThresholds | null> {
    try {
      const result = await this.maxRedeemTresholdsModel
        .findOneAndUpdate({ keyword_id: keyword_id, keyword: keyword }, data, {
          new: true,
        })
        .exec();
      console.log('=== CHECK MAX REDEEM RESULT UPDATE ===', result);
      if (!result) {
        throw new NotFoundException('MaxRedeemThreshold not found');
      }
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error updating MaxRedeemThreshold:', error);
      throw new Error('Failed to update MaxRedeemThreshold');
    }
  }

  async maxRedeemThresholdsDelete(
    keyword_id: string,
    keyword: string,
  ): Promise<any> {
    try {
      const result = await this.maxRedeemTresholdsModel
        .findOneAndUpdate(
          { keyword_id: keyword_id, keyword: keyword },
          { deleted_at: new Date() }, // Soft delete by setting deleted_at to the current date/time
          { new: true },
        )
        .exec();

      if (!result) {
        throw new NotFoundException('MaxRedeemThreshold not found');
      }
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error deleting MaxRedeemThreshold:', error);
      throw new Error('Failed to delete MaxRedeemThreshold');
    }
  }

  /**
   * RESET MAX REDEEM COUNTER
   */
  public async cronResetMaxRedeemCounter(): Promise<void> {
    try {
      const currentDateTime = moment().utc();
      const currentHour: string = moment().utc().add(7, 'hours').format('HH'); // untuk filter time menggunakan format UTC+7
      const currentDay: string = moment().utc().add(7, 'hours').format('DD'); // untuk filter date menggunakan format UTC+7
      const currentDate: string = currentDateTime.format('YYYY-MM-DD'); // untuk filter start_date & end_date menggunakan format UTC+0

      const filter = {
        $match: {
          start_date: {
            $lte: currentDate,
          },
          end_date: {
            $gte: currentDate,
          },
          deleted_at: null,
        },
      };

      console.log('currentHour', currentHour);
      console.log('currentDateTime', currentDateTime);
      console.log('filter', JSON.stringify(filter));

      const [activeThresholds] = await this.maxRedeemTresholdsModel.aggregate([
        filter,
        {
          $project: {
            _id: 0,
            type: 1,
            keyword: 1,
            program: { $ifNull: ['$program', null] },
            max_mode: { $ifNull: ['$max_mode', null] },
            isResetEveryMonth: {
              $and: [
                { $eq: ['$type', 'MONTHLY'] },
                { $in: [currentDay.toString(), '$date'] },
                { $in: [currentHour.toString(), '$time'] },
              ],
            },
            isResetEveryDay: {
              $and: [
                { $eq: ['$type', 'DAILY'] },
                { $in: [currentHour.toString(), '$time'] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            maxModeProgram: {
              $push: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$max_mode', 'Program'] },
                      {
                        $or: [
                          { $eq: ['$isResetEveryDay', true] },
                          { $eq: ['$isResetEveryMonth', true] },
                        ],
                      },
                    ],
                  },
                  then: '$program',
                  else: null,
                },
              },
            },
            maxModeNotProgram: {
              $push: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$max_mode', 'Program'] },
                      { $ne: ['$max_mode', null] },
                      {
                        $or: [
                          { $eq: ['$isResetEveryDay', true] },
                          { $eq: ['$isResetEveryMonth', true] },
                        ],
                      },
                    ],
                  },
                  then: '$keyword',
                  else: null,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            maxRedeemThresholdsProgram: { $filter: { input: '$maxModeProgram', as: 'program', cond: { $ne: ['$$program', null] } } },
            maxRedeemThresholdsNotProgram: { $filter: { input: '$maxModeNotProgram', as: 'keyword', cond: { $ne: ['$$keyword', null] } } },
          },
        },
      ]);

      console.log('thresholds :', activeThresholds);

      const programs = activeThresholds.maxRedeemThresholdsProgram;
      const keywords = activeThresholds.maxRedeemThresholdsNotProgram;

      /**
       * reset max redeem counter in check_redeem
       * jika max_mode bertipe program maka update check_redeem base on program nya
       * else update check_redeem base on keyword nya
       */

      if (programs.length > 0 && keywords.length > 0) {
        await Promise.all([
          this.checkRedeem.updateMany(
            { program: { $in: programs } },
            { counter: 0 },
          ),

          this.checkRedeem.updateMany(
            { keyword: { $in: keywords } },
            { counter: 0 },
          ),
        ]);

        console.log('== program & keyword - update reset max redeem counter success ==');
        return;
      }

      if (keywords.length > 0) {
        await this.checkRedeem.updateMany(
          { keyword: { $in: keywords } },
          { counter: 0 },
        );

        console.log('== keyword - update reset max redeem counter success ==');
      }

      if (programs.length > 0) {
        await this.checkRedeem.updateMany(
          { program: { $in: programs } },
          { counter: 0 },
        );

        console.log('== program - update reset max redeem counter success ==');
      }
    } catch (error) {
      console.log(error.message);
      throw new Error('Failed to reset cronResetMaxRedeemCounter');
    }
  }
}
