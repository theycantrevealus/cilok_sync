import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { VoucherBatchDto } from '@/voucher/dto/voucher.batch.dto';
import { Voucher, VoucherDocument } from '@/transaction/models/voucher/voucher.model';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');
const FormData = require('form-data');

@Injectable()
export class VoucherService {
  private httpService: HttpService;
  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_port: number;
  private raw_core: string;

  constructor(
    configService: ConfigService,
    httpService: HttpService,
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
  }

  async addVoucherBatch(payload: VoucherBatchDto, authToken: string) {
    let data;

    payload.realm_id = this.realm;
    payload.branch_id = this.branch;
    payload.merchant_id = this.merchant;

    await new Promise(async (resolve, reject) => {
      const postData = JSON.stringify(payload);
      const options = {
        method: 'POST',
        hostname: this.raw_core,
        port: this.raw_port > 0 ? this.raw_port : null,
        path: `/gateway/v3.0/vouchers/batch`,
        headers: {
          Authorization: authToken,
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            data = response;
            resolve(response);
          }
        });
      });

      req.on('error', function (e) {
        throw new HttpException(JSON.stringify(e), 500);
        // resolve(e);
      });

      req.write(postData);
      req.end();
    });

    if (data.code == 'S00000') {
      // store to local
      const voucherCreation = new this.voucherModel(payload);
      voucherCreation
        .save()
        .then(async (returning) => {
          return returning;
        })
        .catch((e) => {
          throw new Error(e);
        });
    }

    return data;
  }

  async addVoucherImport(
    payload: VoucherBatchDto,
    file: any,
    authToken: string,
  ) {
    const url = 'https://api.developer.wegiv.co/gateway/v3.0/vouchers/import';
    const bodyFormData = new FormData();

    bodyFormData.append('type', payload.type);
    bodyFormData.append('realm_id', this.realm);
    bodyFormData.append('branch_id', this.branch);
    bodyFormData.append('merchant_id', this.merchant);
    bodyFormData.append(
      'image',
      fs.createReadStream(`./uploads/voucher/${file.filename}`),
    );

    return await lastValueFrom(
      this.httpService
        .post(url, bodyFormData, { headers: { Authorization: authToken } })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code == 'S00000') {
              // store to local
              const voucherCreation = new this.voucherModel(payload);
              voucherCreation
                .save()
                .then(async (returning) => {
                  return returning;
                })
                .catch((e) => {
                  throw new Error(e);
                });
              return data;
            }
          }),
          catchError(async (err: any) => {
            throw new HttpException(err.response.data, err.response.status);
            // return err;
          }),
        ),
    );
  }
}
