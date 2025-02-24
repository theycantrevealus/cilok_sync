import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Queue } from 'bull';
import { Request } from 'express';
import * as requestIp from 'request-ip';

abstract class AbstractLogOauthService {
  protected logQueue: Queue;

  constructor(@InjectQueue('logging') logQueue: Queue) {
    this.logQueue = logQueue;
  }

  logRequest(path: string, request: Request) {
    const ip = request.clientIp
      ? request.clientIp
      : requestIp.getClientIp(request);
    this.logQueue.add('log-oauth-request', {
      path: path,
      host: ip,
      headers: request.headers,
      body: request.body,
    });
  }

  logResponse(url: string, response: AxiosResponse<any>) {
    if (response) {
      this.logQueue.add('log-oauth-response', {
        url: url,
        headers: response.headers,
        body: response.data,
      });
    }
  }
}

@Injectable()
export class LogOauthRefreshTokenService extends AbstractLogOauthService {
  //
}

@Injectable()
export class LogOauthSignInService extends AbstractLogOauthService {
  logRequest(path: string, request: Request) {
    // remove password data from request
    this.logQueue.add(
      'log-oauth-request',
      {
        path: path,
        ip: request.ip,
        headers: request.headers,
        body: this.removePasswordField(request.body),
      },
      { removeOnComplete: true },
    );
  }

  protected removePasswordField(requestBody: any): any {
    if (requestBody?.password) delete requestBody.password;

    return requestBody;
  }
}

@Injectable()
export class LogOauthSignOutService extends AbstractLogOauthService {
  //
}
