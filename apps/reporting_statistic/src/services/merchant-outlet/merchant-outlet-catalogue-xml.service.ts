import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const path = require('path');

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';

import { MerchantOutletService } from '@/merchant/services/merchant.outlet.service';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';

@Injectable()
export class MerchantOutletCatalogueXMLService {
  constructor(
    httpService: HttpService,
    private readonly configService: ConfigService,
    private merchantOutletService: MerchantOutletService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
  ) {
    //
  }

  async generateXML(parameter, payload) {
    const serviceResult = new ReportingServiceResult({ is_error: false });
    try {
      console.log('[XML] > Merchant Outlet Catalogue START');
      const merchantOutletData =
        await this.merchantOutletService.generateMerchantOutletXmlFileV2();

      if (!merchantOutletData) {
        console.error(
          '[XML] > Data tidak ditemukan atau tidak memiliki nilai!',
        );
      } else {
        const dir = path.resolve(__dirname, payload.generated_dir);
        // const dirFileXML = `${dir}/${payload.name_file_xml}`;
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const pathxml = path.resolve(dir, payload.name_file_xml);
        writeFileSync(pathxml, merchantOutletData.toString(), { flag: 'w' });
        console.log('[XML] > Merchant Outlet Catalogue XML file generated!');
      }

      console.log('[XML] > Merchant Outlet Catalogue END');

      serviceResult.message = 'Success generate merchant outlet';
      await this.checkAndSetLog(
        'Merchant Outlet Catalogue - Generate XML',
        serviceResult,
        payload,
        new Date(),
      );
      return;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      await this.checkAndSetLog(
        'Merchant Outlet Catalogue - Generate XML',
        serviceResult,
        payload,
        new Date(),
      );
      return;
    }
  }

  async checkAndSetLog(
    transcationName: string,
    result: ReportingServiceResult,
    payload: any,
    startTime: Date,
  ) {
    let errStatus = false,
      errCode = result?.custom_code ?? HttpStatus.OK;

    const errResult = { ...result };
    if (errResult.is_error) {
      errStatus = true;
      errCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // insert logging
    await this.loggerReportGeneration(
      payload,
      errStatus,
      transcationName,
      errResult,
      startTime,
      errCode,
    );
  }

  /**
   * For handle log reporting generation
   */
  async loggerReportGeneration(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload?.tracing_id ?? '-',
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_generation',
        service: this.constructor.name,
        step: step,
        taken_time: takenTime,
        result: result,
        payload: {
          service: this.constructor.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
