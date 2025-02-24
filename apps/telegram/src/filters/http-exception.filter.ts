import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      (exception as any)?.response?.message ?? (exception as any)?.message;
    let code = 'HttpException';

    this.logger.error(exception);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = exception.name;
    }

    const responseBody = {
      status: status,
      code: code,
      message: message,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
