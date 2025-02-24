import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class LinkAjaConfig {
  private url!: string;
  private url_bonus!: string;
  private username!: string;
  private secret!: string;
  private username_bonus!: string;
  private secret_bonus!: string;
  public proxy_url!: string;
  public proxy_port!: string;
  public http_type!: string;
  public timeout_outbound!: string;

  constructor(private httpService: HttpService, configService: ConfigService) {
    this.username = `${configService.get<string>(
      'link-aja-backend.client.username',
    )}`;
    this.username_bonus = `${configService.get<string>(
      'link-aja-backend.client.username_bonus',
    )}`;
    this.secret = `${configService.get<string>(
      'link-aja-backend.client.secret',
    )}`;
    this.secret_bonus = `${configService.get<string>(
      'link-aja-backend.client.secret_bonus',
    )}`;
    this.url = `${configService.get<string>('link-aja-backend.api.url')}`;
    this.url_bonus = `${configService.get<string>(
      'link-aja-backend.api.url_bonus',
    )}`;
    this.proxy_url = `${configService.get<string>(
      'link-aja-backend.client.proxy',
    )}`;
    this.proxy_port = `${configService.get<string>(
      'link-aja-backend.client.port',
    )}`;
    this.timeout_outbound = `${configService.get<string>(
      'link-aja-backend.client.timeout',
    )}`;
  }

  // /**
  //  * Procedure for init auth & http service link-aja
  //  */
  // initHttpService(): void {
  //   this.httpService.axiosRef.defaults.baseURL = this.url;
  // }

  getUrl() {
    return this.url;
  }
  getUrlBonus() {
    return this.url_bonus;
  }

  getHttpService(): HttpService {
    return this.httpService;
  }

  /**
   * function for get header with algorithm hmac-sha256
   * @param method
   * @param endpoint
   * @param payload
   */
  getHeader(method, endpoint, payload?: any) {
    // const path = '/v1' + endpoint;

    console.log('-------------------------');
    const path = '/v1' + endpoint;
    console.log(path, 'path token');
    console.log(method, 'method');
    console.log(payload, 'payload');

    console.log(this.username, 'username tsel');
    console.log(this.secret, 'secret tsel');

    console.log('-------------------------');
    const CryptoJS = require('crypto-js');
    const algorithm = 'hmac-sha256';
    const digestBody = CryptoJS.SHA256(JSON.stringify(payload, null, 2));
    const digestBodyHeader =
      'SHA-256=' + digestBody.toString(CryptoJS.enc.Base64);
    const dateFormat = new Date().toUTCString();

    const signingString =
      'date: ' +
      dateFormat +
      '\n' +
      method +
      ' ' +
      path +
      ' HTTP/1.1' +
      '\n' +
      'digest: ' +
      digestBodyHeader;

    console.log(signingString, 'signingString');
    const signature = CryptoJS.HmacSHA256(signingString, this.secret).toString(
      CryptoJS.enc.Base64,
    );
    const authorization =
      'hmac username="' +
      this.username +
      '", algorithm="' +
      algorithm +
      '", headers="date request-line digest", signature="' +
      signature +
      '"';

    const data = {
      'Content-Type': 'application/json',
      Authorization: authorization,
      Date: dateFormat,
      Digest: digestBodyHeader,
    };

    return data;
  }

  getHeaderBonus(method, endpoint, payload?: any) {
    // const path = '/v1' + endpoint;

    console.log('-------------------------');
    const path = '/' + endpoint;
    console.log(path, 'path token bonus');
    console.log(method, 'method bonus');
    console.log(JSON.stringify(payload, null, 2), 'payload bonus');

    console.log(this.username_bonus, 'username tsel bonus');
    console.log(this.secret_bonus, 'secret tsel bonus');

    console.log('-------------------------');
    // const CryptoJS = require('crypto-js');
    const algorithm = 'hmac-sha256';
    const digestBody = CryptoJS.SHA256(JSON.stringify(payload, null, 2));
    // console.log(payload, 'payload');
    // console.log(digestBody, 'digestBody');
    // console.log(digestBody.toString(), 'digestBody.toString');
    const digestBodyHeader =
      'SHA-256=' + digestBody.toString(CryptoJS.enc.Base64);
    const dateFormat = new Date().toUTCString();

    const signingString =
      'date: ' +
      dateFormat +
      '\n' +
      method +
      ' ' +
      path +
      ' HTTP/1.1' +
      '\n' +
      'digest: ' +
      digestBodyHeader;
    const signature = CryptoJS.HmacSHA256(
      signingString,
      this.secret_bonus.toString(),
    ).toString(CryptoJS.enc.Base64);
    const authorization =
      'hmac username="' +
      this.username_bonus.toString() +
      '", algorithm="' +
      algorithm +
      '", headers="date request-line digest", signature="' +
      signature +
      '"';

    const data = {
      'Content-Type': 'application/json',
      Authorization: authorization,
      Date: dateFormat,
      Digest: digestBodyHeader,
    };

    return data;
  }

  getHeaderV2() {
    // Header
    const header = {
      alg: 'HS256',
      typ: 'JWT',
      pid: process.env.LINK_AJA_BACKEND_CLIENT_PID,
    };

    // Payload
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 10; // 10 menit ke depan
    const payload = {
      exp,
    };

    // Signature
    const secret = process.env.LINK_AJA_BACKEND_CLIENT_SECRET_JWT;

    // Membuat token
    const token = jwt.sign(payload, secret, { header });

    const dataRes = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    return dataRes;
  }
}
