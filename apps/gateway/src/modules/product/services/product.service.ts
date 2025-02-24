import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';

@Injectable()
export class ProductService {
  private httpService: HttpService;
  private url: string;
  private realm: string;
  private branch: string;

  constructor(httpService: HttpService, configService: ConfigService) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}/products`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
  }

  getProduct(param: any): Observable<AxiosResponse<any, any>> {
    const params = {
      search_term: param.search_term === undefined ? '' : param.search_term,
      limit: param.limit && param.limit !== '' ? parseInt(param.limit) : 10,
      skip: param.skip && param.skip !== '' ? parseInt(param.skip) : 0,
      sort: param.sort && param.sort !== '' ? param.sort : '{}',
      filter: param.filter && param.filter !== '' ? `${param.filter}` : '{}',
      projection:
        param.projection && param.projection !== ''
          ? `${param.projection}`
          : '{}',
      addon: param.addon && param.addon !== '' ? `${param.addon}` : '{}',
      realm_id: `${this.realm}`,
      branch_id: `${this.branch}`,
    };

    return this.httpService.get(`${this.url}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: param.auth,
      },
      params: params,
    });
  }

  getUrl(): string {
    return this.url;
  }
}
