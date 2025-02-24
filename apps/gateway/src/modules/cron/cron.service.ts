import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import cronstrue from 'cronstrue';
import { Model } from 'mongoose';

import { GeneralApiResponses } from '@/dtos/global.responses.dto';
import { Lov, LovDocument } from '@/lov/models/lov.model';

import { CronResDTO } from './cron.property';

@Injectable()
export class CronService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
  ) {}

  cronjobList() {
    const jobs = this.schedulerRegistry.getCronJobs();
    let counter = 0;
    const jobLists = [];
    jobs.forEach((value, key, map) => {
      if (!key.includes('_SUB')) {
        jobLists[counter] = {
          cronjob_name: key,
          running: value.running,
        };
        counter++;
      } else {
        const objIndex = jobLists.findIndex(
          (obj) => obj.cronjob_name == key.replace('_SUB', ''),
        );
        jobLists[objIndex].running = value.running;
      }
    });
    return jobLists;
  }

  // ==================================

  async getAllCronjob() {
    const response = new CronResDTO();
    const process = this.cronjobList();
    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: process };
    } else {
      response.status = GeneralApiResponses.R404.status;
      response.message = GeneralApiResponses.R404.description;
    }
    return response;
  }

  // ==================================

  async getAllCronjobConfig() {
    const response = new CronResDTO();
    const process = await this.lovModel
      .find({ group_name: 'CRONJOB' })
      .then((results) => {
        return results;
      });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: process };
    } else {
      response.status = GeneralApiResponses.R404.status;
      response.message = GeneralApiResponses.R404.description;
    }
    return response;
  }

  // ==================================

  async getAllCronjobConfigByKey(param: string) {
    const response = new CronResDTO();
    const process = await this.lovModel
      .findOne({ group_name: 'CRONJOB', set_value: param })
      .then((results) => {
        return results;
      });

    if (process) {
      response.status = GeneralApiResponses.R200.status;
      response.message = GeneralApiResponses.R200.description;
      response.payload = { data: process };
    } else {
      response.status = GeneralApiResponses.R404.status;
      response.message = GeneralApiResponses.R404.description;
    }
    return response;
  }

  // ==================================

  async editCronjobConfig(data: any) {
    const response = new CronResDTO();
    if (data.running === true || data.running === false) {
      data.interval = String(data.interval);
      try {
        cronstrue.toString(data.interval);
      } catch (error) {
        response.status = GeneralApiResponses.R400.status;
        response.message =
          'Cronjob interval format in invalid, check crontab format';
        return response;
      }

      const dtParam = {
        group_name: 'CRONJOB',
        set_value: data.cronjob_name,
      };
      const q = await this.lovModel
        .findOne(dtParam)
        .select('additional.cronjob');
      if (q !== null) {
        const oldStatus = q.additional.cronjob.status;
        const oldInterval = q.additional.cronjob.interval;

        if (oldStatus !== data.running || oldInterval !== data.interval) {
          const dtCronjob = {
            running: data.running,
            interval: data.interval,
          };

          const process = await this.lovModel.findOneAndUpdate(
            dtParam,
            { 'additional.cronjob': dtCronjob },
            { new: true },
          );
          if (process) {
            const jobMonitor = this.schedulerRegistry.getCronJob(
              data.cronjob_name,
            );
            jobMonitor.stop();
            jobMonitor.start();
            response.status = GeneralApiResponses.R200.status;
            response.message = GeneralApiResponses.R200.description;
            response.payload = { data: process };
          } else {
            response.status = GeneralApiResponses.R500.status;
            response.message = GeneralApiResponses.R500.description;
          }
        } else {
          response.status = GeneralApiResponses.R200.status;
          response.message = 'Cronjob config is no changes';
        }
      } else {
        response.status = GeneralApiResponses.R400.status;
        response.message = 'Cronjob with the name is not found';
      }
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Running value just for boolean (true/false) only';
    }

    return response;
  }

  // ==================================

  async editCronjobData(data: any) {
    const response = new CronResDTO();
    const cronjobName = data.cronjob_name;
    delete data['cronjob_name'];
    const dtCronjob = data;
    const dtParam = {
      group_name: 'CRONJOB',
      set_value: cronjobName,
    };
    const q = await this.lovModel.findOne(dtParam).select('additional.data');
    if (q !== null) {
      const process = await this.lovModel.findOneAndUpdate(
        dtParam,
        { 'additional.data': dtCronjob },
        { new: true },
      );
      if (process) {
        response.status = GeneralApiResponses.R200.status;
        response.message = GeneralApiResponses.R200.description;
        response.payload = { data: process };
      } else {
        response.status = GeneralApiResponses.R500.status;
        response.message = GeneralApiResponses.R500.description;
      }
    } else {
      response.status = GeneralApiResponses.R400.status;
      response.message = 'Cronjob with the name is not found';
    }
    return response;
  }
}
