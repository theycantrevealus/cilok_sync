import {InjectQueue} from '@nestjs/bull';
import {HttpStatus, Injectable} from '@nestjs/common';
import {Queue} from 'bull';
import mongoose, {Model} from 'mongoose';
import {LocalFileDto} from '@/application/utils/FilterDT/file.dto';
import {GlobalResponse} from '@/dtos/response.dto';
import {InjectModel} from "@nestjs/mongoose";
import {LuckyDrawUploadDocument, LuckyDrawUploadModel} from "@/lucky-draw/models/lucky.draw.upload.model";

@Injectable()
export class LuckyDrawService {
  protected uploadFileLuckyDrawQueue: Queue;

  constructor(
    @InjectQueue('lucky-draw') uploadFileLuckyDrawQueue: Queue,
    @InjectModel(LuckyDrawUploadModel.name)
    private luckyDrawUploadModel: Model<LuckyDrawUploadDocument>,
  ) {
    this.uploadFileLuckyDrawQueue = uploadFileLuckyDrawQueue;
  }
  async getJob(id: string) {
    return await this.uploadFileLuckyDrawQueue.getJob(id);
  }
  async uploadFileLuckyDraw(
    fileData: LocalFileDto,
    credential: any,
  ) {
    const response = new GlobalResponse();
    if (credential && credential.account_location) {
      const luckyDrawSave = await this.luckyDrawUploadModel.create({
        filename: fileData.filename,
        path: fileData.path,
        status: 'Process',
        account: credential?._id
      })
      if (luckyDrawSave) {
        const process = this.uploadFileLuckyDrawQueue
          .add(
            'lucky-draw-upload',
            {
              account: credential?._id,
              list: fileData,
              bulkCount: 100,
              trace_id: luckyDrawSave?._id
            },
            {removeOnComplete: false},
          )
          .then((job) => {
            return {job: job.id};
          });

        const payload = {
          fileData: fileData,
        };
        response.payload = payload;
        response.transaction_classify = 'UPLOAD FILE LUCKY DRAW';

        if (process) {
          response.statusCode = HttpStatus.OK;
          response.message = 'Upload process successfully';
        } else {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Upload process failed';
        }
      }
    } else {
      response.statusCode = HttpStatus.UNAUTHORIZED;
      response.message = 'No credential account found';
    }
    return response;
  }
}
