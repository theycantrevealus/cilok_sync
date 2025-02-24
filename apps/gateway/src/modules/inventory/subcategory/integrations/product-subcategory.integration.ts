import { InventoryHttpservice } from "@/inventory/config/inventory-http.service";
import { InventoryQuery } from "@/inventory/dtos/inventory.query";
import { HttpException, Injectable } from "@nestjs/common";
import { catchError, lastValueFrom, map, throwError } from "rxjs";
import { ProductSubcategoryRequestDto } from "../dtos/product-subcategory.dto";
import { ProductSubategoryUpdateRequestDto } from "../dtos/product-subcategory.request";
import { ProductSubcategoryAddResponse } from "../dtos/product-subcategory.response";

@Injectable()
export class ProductSubcategoryIntegration {
  private httpService: InventoryHttpservice;

  constructor(
    httpService: InventoryHttpservice,
  ) {
    this.httpService = httpService;
  }

  async get(params: InventoryQuery, token: string, id?: string): Promise<any> {    
    const path = (id) ? `product-sub-categories/${id}` : `product-sub-categories`;
    return await lastValueFrom(
      this.httpService.initHttpService().
        get<any>(path,
          {
            headers: this.httpService.getHeaders(token),
            params: params,
          })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = "INVENTORY_PRODUCT_SUBCATEGORY"
            return res.data;
          }),
          catchError(async (err) => {
            throw err;
          }),
        )
    )
  }

  async post(payload : ProductSubcategoryRequestDto, token: string) : Promise<ProductSubcategoryAddResponse> {
    // Static Data branch_id and realm_id
    payload.branch_id = this.httpService.getBranch();
    payload.realm_id = this.httpService.getRealm();

    return await lastValueFrom(
      this.httpService.initHttpService().
        post<any>(`product-sub-categories`, 
          payload,
          {
            headers: this.httpService.getHeaders(token),
          })
        .pipe(
          map(async (res) => {
            res.data.transaction_classify = "INVENTORY_PRODUCT_SUBCATEGORY"
            return res.data;
          }),
          catchError(async (err) => {
            return err.response.data
          }),
        )
    )
  }

  async patch(payload : ProductSubategoryUpdateRequestDto, token: string, id: string) {
    return await lastValueFrom(
      this.httpService.initHttpService().
        patch<any>(`product-sub-categories/${id}`, 
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
      this.httpService.initHttpService().delete<any>(`product-sub-categories/${id}`,
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
