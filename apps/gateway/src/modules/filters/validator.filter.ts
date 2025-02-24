import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExceptionData } from '@utils/logger/handler';
import { Request, Response } from 'express';
import { Logger } from 'winston';

import { isJson } from '@/application/utils/JSON/json';
import {
  HttpCodeTransaction,
  responseGlobal,
} from '@/dtos/global.http.status.transaction.dto';

import { WINSTON_MODULE_PROVIDER } from '../../../../utils/logger/constants';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const logData = {
      statusCode: response.status,
      level: response.statusCode === 403 ? 'WARN' : 'ERROR',
      transaction_id: '',
      notif_customer: false,
      notif_operation: true,
      taken_time: 0,
      payload: {
        service: 'GATEWAY',
        method: request.method,
        url: request.url,
        user_id: null,
        step: '',
        param: request.body,
        result: response,
      },
    };

    if (response.statusCode === 403) {
      this.logger.warn(logData);
    } else {
      this.logger.error(logData);
    }

    if (isJson(response)) {
      //response.status(status).json({
      response.status(status).send({
        ...response,
        code: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(status).send({
        code: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}

@Catch(BadRequestException)
export class RequestValidatorFilter implements ExceptionFilter {
  constructor() {
    //
  }
  catch(exception: BadRequestException, host: ArgumentsHost) {
    this.handlingError(exception, host);
  }

  handlingError(exception: BadRequestException, host: ArgumentsHost) {
    console.log('------------------ exception filter RequestValidatorFilter');
    console.log(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // const status = exception.getStatus();
    const status = exception.getStatus();
    const parseResponse = exception.getResponse();

    // Format Check
    // Get default error from parseResponse['error']
    const errors = parseResponse['message'];
    let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseCustomCode = '-';
    let responseMessage = [];
    let responseCustomErrorMessage = '';
    let trace_id = '';
    if (errors instanceof Array) {
      errors.map((err) => {
        if (err instanceof Object) {
          const checkFormat = Object.keys(err);
          if (err?.trace_id) {
            trace_id = err?.trace_id;
            delete err?.trace_id;
          }
          responseMessage = responseMessage.concat(Object.values(err));
          const errorLib = responseGlobal.error;
          if (checkFormat.length > 0) {
            let problem = 'format';
            if (errorLib.format.condition.indexOf(checkFormat[0]) > -1) {
              problem = 'format';
            } else if (
              errorLib.insufficient.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'insufficient';
            } else if (
              errorLib.required.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'required';
            } else if (
              errorLib.unAuthorized.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'unAuthorized';
            } else if (
              errorLib.tokenNotFoundOrExpired.condition.indexOf(
                checkFormat[0],
              ) > -1
            ) {
              problem = 'tokenNotFoundOrExpired';
            } else if (
              errorLib.tokenMissing.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'tokenMissing';
            } else if (
              errorLib.invalid.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'invalid';
            } else if (
              errorLib.notFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFound';
            } else if (
              errorLib.unregisteredProgram.condition.indexOf(checkFormat[0]) >
              -1
            ) {
              problem = 'unregisteredProgram';
            } else if (
              errorLib.notFoundGeneral.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFoundGeneral';
            } else if (
              errorLib.voucherCodeLength.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'voucherCodeLength';
            } else if (
              errorLib.merchantNotFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'merchantNotFound';
            } else {
              problem = 'general';
            }

            responseCustomCode = responseGlobal.error[problem].forResponse.code;
            responseCode = responseGlobal.error[problem].httpCode;
            responseCustomErrorMessage =
              responseGlobal.error[problem].forResponse.message;

            return false;
          }
        } else {
          responseCustomCode = '-';
          responseCode = 400;
          responseCustomErrorMessage = errors.toString();
          return false;
        }
      });
    } else {
      // if(parseResponse['response']['data']){
      //   console.log(parseResponse['response']['data'])
      //   responseCustomCode = parseResponse['response']['data']['code'];
      //   responseCode = status;
      //   responseCustomErrorMessage = parseResponse['response']['data']['message'];
      // }else{
      responseMessage.push(errors);
      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = responseGlobal.error['general'].httpCode;
      const integrationError = parseResponse['cause']?.response.data.message;
      if (integrationError instanceof Array) {
        integrationError.map((sErr) => {
          console.log(sErr);
          responseMessage.push(sErr.message);
        });
      } else {
        responseMessage.push(integrationError);
      }

      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = status ?? responseGlobal.error['general'].httpCode;
      responseCustomErrorMessage =
        responseGlobal.error['general'].forResponse.message;
      // }
    }

    const data = request.body;
    let returning = 'S00000';

    if (data?.keyword && /\s/.test(data?.keyword)) {
      const paramx = data.keyword.split(' ').pop();
      if (/\d/.test(paramx) == false) {
        returning = 'S00000';
      }
    }

    if (trace_id) {
      response.status(responseCode).send({
        code: responseCustomCode,
        message: responseMessage.join(' '),
        payload: {
          trace_id: trace_id,
        },
      });
    } else {
      response.status(responseCode).send({
        code: responseCustomCode,
        message: responseCustomErrorMessage,
        description: responseMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}

@Catch(Error)
export class CommonException implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    //
  }
  catch(exception: Error, host: ArgumentsHost) {
    console.log('------------------ exception filter CommonException');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const codeIdentifier = exception.message.split(' ');
    let codeSet = HttpStatus.FAILED_DEPENDENCY;
    switch (codeIdentifier[0]) {
      case 'E11000':
        codeSet = HttpStatus.UNPROCESSABLE_ENTITY;
        break;
      default:
        codeSet = HttpStatus.FAILED_DEPENDENCY;
    }

    const errorData: any = exception;

    const logData = {
      statusCode: errorData.response.statusCode,
      level: errorData.response.statusCode === 403 ? 'WARN' : 'ERROR',
      transaction_id: '',
      notif_customer: false,
      notif_operation: true,
      taken_time: 0,
      payload: {
        service: 'GATEWAY',
        method: request.method,
        url: request.url,
        user_id: null,
        step: '',
        param: request.body,
        result: errorData.response.message,
      },
    };

    if (errorData.response.statusCode === 403) {
      this.logger.warn(logData);
    } else {
      this.logger.error(logData);
    }

    response.status(errorData.response.statusCode).send({
      code: errorData.response.statusCode,
      message: [exception.message],
      description: errorData.response.message ?? '',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

@Catch(Error)
export class RequestValidatorFilterCustom implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    //
  }
  catch(exception: Error, host: ArgumentsHost) {
    const errorData: any = exception;
    const ctx = host.switchToHttp();
    const responseCustom = errorData.response;
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const codeIdentifier = exception.message.split(' ');
    let codeSet = HttpStatus.FAILED_DEPENDENCY;
    switch (codeIdentifier[0]) {
      case 'E11000':
        codeSet = HttpStatus.UNPROCESSABLE_ENTITY;
        break;
      default:
        codeSet = HttpStatus.FAILED_DEPENDENCY;
    }

    console.log('<-- DATA FILTER -->');
    console.log('Exception Name : ', exception);
    console.log('Real Error Data Response : ', errorData.response);

    const errors = responseCustom['message'] ?? '';
    let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseCustomCode = '-';
    let responseMessage = [];
    let responseCustomErrorMessage = '';
    let trace_id = '';

    if (errors instanceof Array) {
      errors.map((err) => {
        if (err instanceof Object) {
          const checkFormat = Object.keys(err);
          if (err?.trace_id) {
            trace_id = err?.trace_id;
            delete err?.trace_id;
          }
          responseMessage = responseMessage.concat(Object.values(err));
          const errorLib = responseGlobal.error;
          if (checkFormat.length > 0) {
            let problem = 'format';
            if (errorLib.format.condition.indexOf(checkFormat[0]) > -1) {
              problem = 'format';
            } else if (
              errorLib.insufficient.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'insufficient';
            } else if (
              errorLib.required.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'required';
            } else if (
              errorLib.unAuthorized.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'unAuthorized';
            } else if (
              errorLib.tokenNotFoundOrExpired.condition.indexOf(
                checkFormat[0],
              ) > -1
            ) {
              problem = 'tokenNotFoundOrExpired';
            } else if (
              errorLib.tokenMissing.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'tokenMissing';
            } else if (
              errorLib.invalid.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'invalid';
            } else if (
              errorLib.notFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFound';
            } else if (
              errorLib.unregisteredProgram.condition.indexOf(checkFormat[0]) >
              -1
            ) {
              problem = 'unregisteredProgram';
            } else if (
              errorLib.notFoundGeneral.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFoundGeneral';
            } else if (
              errorLib.voucherCodeLength.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'voucherCodeLength';
            } else if (
              errorLib.merchantNotFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'merchantNotFound';
            } else {
              problem = 'general';
            }

            responseCustomCode = responseGlobal.error[problem].forResponse.code;
            responseCode = responseGlobal.error[problem].httpCode;
            responseCustomErrorMessage =
              responseGlobal.error[problem].forResponse.message;

            // return false;
          }
        } else {
          responseCustomCode = '-';
          responseCode = 400;
          responseCustomErrorMessage = errors.toString();
          // return false;
        }
      });
    } else {
      responseMessage.push(errors);
      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = responseGlobal.error['general'].httpCode;
      const integrationError = responseCustom['cause']?.response.data.message;
      if (integrationError instanceof Array) {
        integrationError.map((sErr) => {
          console.log(sErr);
          responseMessage.push(sErr.message);
        });
      } else {
        responseMessage.push(integrationError);
      }

      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = errorData.response.statusCode
        ? errorData.response.statusCode
        : responseGlobal.error['general'].httpCode;
      responseCustomErrorMessage =
        responseGlobal.error['general'].forResponse.message;
    }

    console.log('Response Custom : ', responseCustomErrorMessage);

    if (trace_id) {
      console.log('with trace_id');
      console.log({
        code: responseCustomCode,
        message: responseMessage.join(' '),
        payload: {
          trace_id: trace_id,
        },
      });
    } else {
      console.log({
        statusCode: responseCustom.statusCode,
        code: responseCustomCode,
        message: responseCustomErrorMessage,
        description: responseMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    console.log('<-- DATA FILTER -->');

    const logData = {
      statusCode: responseCustom.statusCode,
      level: responseCustom.statusCode === 403 ? 'WARN' : 'ERROR',
      transaction_id: '',
      notif_customer: false,
      notif_operation: true,
      taken_time: 0,
      payload: {
        service: 'GATEWAY',
        method: request.method,
        url: request.url,
        user_id: null,
        step: '',
        param: request.body,
        result: errorData.response.message,
      },
    };

    if (responseCustom.statusCode === 403) {
      this.logger.warn(logData);
    } else {
      this.logger.error(logData);
    }

    if (errorData.response.code === 403) {
      response.status(errorData.response.statusCode).send({
        code: responseCustomCode,
        message: responseCustomErrorMessage,
        description: [responseMessage],
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      if (trace_id) {
        response.status(responseCustom.statusCode).send({
          code: responseCustomCode,
          message: responseMessage.join(' '),
          payload: {
            trace_id: trace_id,
          },
        });
      } else {
        response.status(responseCustom.statusCode).send({
          code: responseCustomCode,
          message: responseCustomErrorMessage,
          description: responseMessage,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    console.log(
      '------------------ exception filter AllExceptionsFilter',
      exception,
    );
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    let responseBody, httpStatusCustom, loggerCustom;
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (httpStatus == 500) {
      httpStatusCustom = HttpStatus.BAD_REQUEST;
      responseBody = {
        code: HttpCodeTransaction.ERR_DATA_EXISTS_400,
        message: exception.message,
        description: [exception.message],
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
      };

      try {
        const setDataLog: any = {
          statusCode: httpStatusCustom,
          stack: exception?.stack,
          payload: {
            service: 'GATEWAY',
            method: request.method,
            url: request.url,
            param: request.body,
            result: responseBody,
          },
        };

        loggerCustom = this.prepareDataLogger(setDataLog);
      } catch (error) {
        console.log(error);
      }
    } else {
      const [responseBodyCustom, loggerBodyCustom] = this.custom(
        exception,
        host,
      );
      responseBody = responseBodyCustom;
      loggerCustom = loggerBodyCustom;
      httpStatusCustom = httpStatus;
    }

    if (httpStatusCustom === 403) {
      this.logger.warn(loggerCustom);
    } else {
      this.logger.error(loggerCustom);
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatusCustom);
  }

  custom(exception: Error, host: ArgumentsHost): any {
    let rsp = {};
    const errorData: any = exception;
    const ctx = host.switchToHttp();
    const responseCustom = errorData.response;
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const codeIdentifier = exception.message.split(' ');
    let codeSet = HttpStatus.FAILED_DEPENDENCY;
    switch (codeIdentifier[0]) {
      case 'E11000':
        codeSet = HttpStatus.UNPROCESSABLE_ENTITY;
        break;
      default:
        codeSet = HttpStatus.FAILED_DEPENDENCY;
    }

    console.log('<-- DATA FILTER -->');
    console.log('Exception Name : ', exception.message);
    console.log('Real Error Data Response : ', errorData.response);

    const errors = responseCustom['message'];
    let responseCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseCustomCode = '-';
    let responseMessage = [];
    let responseCustomErrorMessage = '';
    let trace_id = '';

    if (errors instanceof Array) {
      errors.map((err) => {
        if (err instanceof Object) {
          const checkFormat = Object.keys(err);
          if (err?.trace_id) {
            trace_id = err?.trace_id;
            delete err?.trace_id;
          }
          responseMessage = responseMessage.concat(Object.values(err));
          const errorLib = responseGlobal.error;
          if (checkFormat.length > 0) {
            let problem = 'format';
            if (errorLib.format.condition.indexOf(checkFormat[0]) > -1) {
              problem = 'format';
            } else if (
              errorLib.insufficient.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'insufficient';
            } else if (
              errorLib.required.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'required';
            } else if (
              errorLib.unAuthorized.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'unAuthorized';
            } else if (
              errorLib.tokenNotFoundOrExpired.condition.indexOf(
                checkFormat[0],
              ) > -1
            ) {
              problem = 'tokenNotFoundOrExpired';
            } else if (
              errorLib.tokenMissing.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'tokenMissing';
            } else if (
              errorLib.invalid.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'invalid';
            } else if (
              errorLib.notFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFound';
            } else if (
              errorLib.unregisteredProgram.condition.indexOf(checkFormat[0]) >
              -1
            ) {
              problem = 'unregisteredProgram';
            } else if (
              errorLib.notFoundGeneral.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'notFoundGeneral';
            } else if (
              errorLib.voucherCodeLength.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'voucherCodeLength';
            } else if (
              errorLib.merchantNotFound.condition.indexOf(checkFormat[0]) > -1
            ) {
              problem = 'merchantNotFound';
            } else {
              problem = 'general';
            }

            responseCustomCode = responseGlobal.error[problem].forResponse.code;
            responseCode = responseGlobal.error[problem].httpCode;
            responseCustomErrorMessage =
              responseGlobal.error[problem].forResponse.message;

            // return false;
          }
        } else {
          responseCustomCode = '-';
          responseCode = 400;
          responseCustomErrorMessage = errors.toString();
          // return false;
        }
      });
    } else {
      responseMessage.push(errors);
      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = responseGlobal.error['general'].httpCode;
      const integrationError = responseCustom['cause']?.response.data.message;
      if (integrationError instanceof Array) {
        integrationError.map((sErr) => {
          console.log(sErr);
          responseMessage.push(sErr.message);
        });
      } else {
        responseMessage.push(integrationError);
      }

      responseCustomCode = responseGlobal.error['general'].forResponse.code;
      responseCode = errorData.response.statusCode
        ? errorData.response.statusCode
        : responseGlobal.error['general'].httpCode;
      responseCustomErrorMessage =
        responseGlobal.error['general'].forResponse.message;
    }

    console.log('Response Custom : ', responseCustomErrorMessage);

    if (trace_id) {
      console.log('with trace_id');
      console.log({
        code: responseCustomCode,
        message: responseMessage.join(' '),
        payload: {
          trace_id: trace_id,
        },
      });
    } else {
      console.log({
        code: responseCustomCode,
        message: responseCustomErrorMessage,
        description: responseMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    console.log('<-- DATA FILTER -->');
    const setDataLog: any = {
      statusCode: responseCustom.statusCode,
      stack: exception?.stack,
      payload: {
        service: 'GATEWAY',
        method: request.method,
        url: request.url,
        param: request.body,
        result: errorData.response.message,
      },
    };

    const logData = this.prepareDataLogger(setDataLog);
    console.log(logData);

    if (responseCustom.statusCode === 403) {
      rsp = {
        code: responseCustomCode,
        message: responseCustomErrorMessage,
        description: responseMessage,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else {
      if (trace_id) {
        rsp = {
          code: responseCustomCode,
          message: responseMessage.join(' '),
          payload: {
            trace_id: trace_id,
          },
        };
      } else {
        rsp = {
          code: responseCustomCode,
          message: responseCustomErrorMessage,
          description: responseMessage,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    }
    console.log('rsp', rsp);
    return [rsp, logData];
  }

  prepareDataLogger(data: any): any {
    const logData = {
      statusCode: data?.statusCode,
      level: data?.level ?? data?.statusCode === 403 ? 'WARN' : 'ERROR',
      transaction_id: data?.transaction_id ?? '',
      notif_customer: data?.notif_customer ?? false,
      notif_operation: data?.notif_operation ?? false,
      taken_time: data?.taken_time ?? 0,
      stack: data?.stack,
      payload: {
        service: data?.payload?.service ?? 'GATEWAY',
        method: data?.payload?.method,
        url: data?.payload?.url,
        user_id: data?.payload?.user_id,
        step: data?.payload?.step ?? '',
        param: data?.payload?.param,
        result: data?.payload?.result,
      },
    };
    return logData;
  }
}
