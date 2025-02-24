import { Account } from "@/account/models/account.model";
import { InventoryQuery } from "@/inventory/dtos/inventory.query";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ProductSubcategoryRequestDto } from "../dtos/product-subcategory.dto";
import { ProductSubategoryUpdateRequestDto } from "../dtos/product-subcategory.request";
import { ProductSubcategoryAddResponse } from "../dtos/product-subcategory.response";
import { ProductSubcategoryIntegration } from "../integrations/product-subcategory.integration";
import { ProductSubcategory, ProductSubcategoryDocument } from "../models/product-subcategory.model";

@Injectable()
export class ProductSubcategoryService {
  private integrationsService: ProductSubcategoryIntegration;
  constructor(
    integrationsService: ProductSubcategoryIntegration,
    @InjectModel(ProductSubcategory.name)
    private productSubcategoryModel: Model<ProductSubcategoryDocument>,
  ) {
    this.integrationsService = integrationsService;
  }

  async get_product_subcategory(params: InventoryQuery, token: string): Promise<any> {
    return await this.integrationsService.get(params, token);
  }

  async get_product_subcategory_by_id(params: InventoryQuery, token: string, id: string): Promise<any> {
    return await this.integrationsService.get(params, token, id);
  }

  async post_product_subcategory(payload: ProductSubcategoryRequestDto, token: string, account: Account) {
    try {
      return await this.integrationsService
        .post(payload, token)
        .then(async (response) => {
          if (response.code !== 'S00000') {
            throw new Error(response.message);
          } else {
            const newData = new this.productSubcategoryModel({
              core_product_subcategory_id: response.payload.id,
              ...payload,
              created_by: account,
            });
            return await newData
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              })
              .then(() => {
                response.transaction_classify = 'INVENTORY_PRODUCT_CATEGORY';
                response.message = 'Add product category success';
                return response;
              });
          }
        })
    } catch (e) {
      throw e;
    }
  }

  async patch_product_subcategory(payload: ProductSubategoryUpdateRequestDto, token: string, id: string) {
    return await this.integrationsService
      .patch(payload, token, id)
      .then(async (response) => {
        if (response.code !== 'S00000') {
          throw new Error(response.message);
        } else {
          response.payload = {
            trace_id: true
          }

          return response;
        }
      });
  }

  async delete_product_subcategory(id: string, merchant_id: string, token: string) {
    try {
      await this.integrationsService.delete(id, token, merchant_id);
      await this.productSubcategoryModel.findOneAndUpdate(
        {
          core_product_subcategory_id: id,
        },
        { deleted_at: Date.now() },
      );

      const response = {
        transaction_classify: "INVENTORY_PRODUCT_SUBCATEGORY",
        message: "deleted subcategory success",
        payload: {
          trace_id: true
        }
      }

      return response;
    } catch (err) {
      throw err;
    }
  }
}
