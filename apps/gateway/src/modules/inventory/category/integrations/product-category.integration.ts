import { InventoryHttpservice } from "@/inventory/config/inventory-http.service";
import { InventoryQuery } from "@/inventory/dtos/inventory.query";
import { HttpException, Injectable } from "@nestjs/common";
import { catchError, lastValueFrom, map, throwError } from "rxjs";
import { ProductCategoryRequestDto, ProductCategoryUpdateRequestDto } from "../dtos/product-category.dto";
import { ProductCategoryResponse } from "../dtos/product-category.response";

@Injectable()
export class ProductCategoryIntegration {
  private httpService: InventoryHttpservice;

  constructor(
    httpService: InventoryHttpservice,
  ) {
    this.httpService = httpService;
  }

  async get(params: InventoryQuery, token: string, id?: string): Promise<ProductCategoryResponse> {    
    const path = (id) ? `product-categories/${id}` : `product-categories`;
    return await lastValueFrom(
      this.httpService.initHttpService().
        get<ProductCategoryResponse>(path,
          {
            headers: this.httpService.getHeaders(token),
            params: params,
          })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = "INVENTORY_PRODUCT_CATEGORY"
            return res.data;
          }),
          catchError(async (err) => {
            throw err;
          }),
        )
    )
  }

  async post(payload : ProductCategoryRequestDto, token: string) {
    payload.branch_id = this.httpService.getBranch();
    payload.realm_id = this.httpService.getRealm();
    
    return await lastValueFrom(
      this.httpService.initHttpService().
        post<any>(`product-categories`, 
          payload,
          {
            headers: this.httpService.getHeaders(token),
          })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = "INVENTORY_PRODUCT_CATEGORY"
            return res.data;
          }),
          catchError(async (err) => {
           return err.response.data
          }),
        )
    )
  }

  async patch(payload : ProductCategoryUpdateRequestDto, token: string, id: string) {
    return await lastValueFrom(
      this.httpService.initHttpService().
        patch<any>(`product-categories/${id}`, 
          payload,
          {
            headers: this.httpService.getHeaders(token),
          })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = "INVENTORY_PRODUCT_CATEGORY"
            return res.data;
          }),
          catchError(async (err) => {
            return err.response.data
          }),
        )
    )
  }

  async delete(id: string, token: string, merchant_id: string) {
    return await lastValueFrom(
      this.httpService.initHttpService().delete<any>(`product-categories/${id}`,
          {
            headers: this.httpService.getHeaders(token),
            params: { merchant_id }
          })
        .pipe(
          map(async (res) => {
            return res.data;
          }),
          catchError(async (err) => {
            throw new Error(err.response.data.message);
          }),
        )
    )
  }
}
