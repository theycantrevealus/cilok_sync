import { BadRequestException, Injectable } from '@nestjs/common';
import { catchError, lastValueFrom, map } from 'rxjs';

import { InventoryHttpservice } from '@/inventory/config/inventory-http.service';
import { InventoryQuery } from '@/inventory/dtos/inventory.query';

import { GlobalResponse } from '../../../dtos/response.dto';
import { ProductRequestDto } from '../dtos/product.request';
import { ProductResponse } from '../dtos/product.response';

@Injectable()
export class ProductIntegration {
  private httpService: InventoryHttpservice;

  constructor(httpService: InventoryHttpservice) {
    this.httpService = httpService;
  }

  async get(params: InventoryQuery, token: string, id?: string): Promise<any> {
    const path = id ? `products/${id}` : `products`;
    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .get<ProductResponse>(path, {
          headers: this.httpService.getHeaders(token),
          params: params,
        })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = 'INVENTORY_PRODUCT';
            return res.data;
          }),
          catchError(async (err) => {
            throw err;
          }),
        ),
    );
  }

  async getOne(merchant_id: string, token: string, id?: string): Promise<any> {
    const path = id ? `products/${id}` : `products`;
    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .get<ProductResponse>(path, {
          headers: this.httpService.getHeaders(token),
          params: {
            merchant_id: merchant_id,
          },
        })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = 'INVENTORY_PRODUCT';
            return res.data;
          }),
          catchError(async (err) => {
            throw err;
          }),
        ),
    );
  }

  async post(payload: ProductRequestDto, token: string) {
    const response = new GlobalResponse();
    payload.branch_id = this.httpService.getBranch();
    payload.realm_id = this.httpService.getRealm();

    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .post<any>(`products`, payload, {
          headers: this.httpService.getHeaders(token),
        })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = 'INVENTORY_PRODUCT';
            return res.data;
          }),
          catchError(async (err) => {
            throw new BadRequestException(err);
            // throwError(() => new BadRequestException(err));
          }),
        ),
    );
  }

  async patch(payload: any, token: string, id: string) {
    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .patch<any>(`products/${id}`, payload, {
          headers: this.httpService.getHeaders(token),
        })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = 'INVENTORY_PRODUCT';
            return res.data;
          }),
          catchError(async (err) => {
            throw new BadRequestException(err);
          }),
        ),
    );
  }

  async delete(id: string, token: string, merchant_id: string) {
    return await lastValueFrom(
      this.httpService
        .initHttpService()
        .delete<any>(`products/${id}`, {
          headers: this.httpService.getHeaders(token),
          params: { merchant_id },
        })
        .pipe(
          map(async (res) => {
            return res.data;
          }),
          catchError(async (err) => {
            throw new Error(err.response.data.message);
          }),
        ),
    );
  }
}
