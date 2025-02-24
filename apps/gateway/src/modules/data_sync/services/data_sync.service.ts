import { availableDataSync } from '@data_sync/const/available-sync';
import { DataSync, DataSyncDocument } from '@data_sync/models/data.sync.model';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GlobalResponse } from '@/dtos/response.dto';

@Injectable()
export class DataSyncService {
  constructor(
    @Inject('DATA_SYNC_PRODUCER') private readonly dataSyncClient: ClientKafka,

    @InjectModel(DataSync.name) private dataSyncModel: Model<DataSyncDocument>,
  ) {}

  async push(parameter, request) {
    console.log('[DATA_SYNC] Request with param: ', parameter);

    const data = await this.dataSyncModel.create({
      ...parameter,
      logged_at: new Date(),
    });

    try {
      const response = new GlobalResponse();
      if (!availableDataSync.includes(parameter.target)) {
        response.statusCode = HttpStatus.BAD_REQUEST;
        response.message = `Data sync for ${parameter.target} not found!`;
        response.payload = {};

        return response;
      }

      // // buat log
      // const data = await this.dataSyncModel.create({
      //   ...parameter,
      //   logged_at: new Date(),
      // });

      console.log('[DATA_SYNC] Log created with id: ', data?._id?.toString());

      // emit ke client
      await this.dataSyncClient.emit('data_sync', {
        log_id: data._id,
        ...parameter,
      });

      response.statusCode = HttpStatus.CREATED;
      response.message = 'Success sync';
      response.payload = parameter;
      return response;
    } catch (err) {
      console.error('[DATA_SYNC] Error: ', err);
    }
  }
}
