import { Account } from "@/account/models/account.model";
import { InventoryQuery } from "@/inventory/dtos/inventory.query";
import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ProductCategoryRequestDto, ProductCategoryUpdateRequestDto } from "../dtos/product-category.dto";
import { ProductCategoryAddResponse, ProductCategoryResponse } from "../dtos/product-category.response";
import { ProductCategoryIntegration } from "../integrations/product-category.integration";
import { ProductCategory, ProductCategoryDocument } from "../models/product-category.model";

@Injectable()
export class ProductCategoryService {
  private integrationsService: ProductCategoryIntegration;
  constructor(
    integrationsService: ProductCategoryIntegration,
    @InjectModel(ProductCategory.name)
    private productCategoryModel: Model<ProductCategoryDocument>,
  ) {
    this.integrationsService = integrationsService;
  }

  async get_product_category(params: InventoryQuery, token: string): Promise<ProductCategoryResponse> {
    return await this.integrationsService.get(params, token);
  }

  async get_product_category_by_id(params: InventoryQuery, token: string, id: string): Promise<ProductCategoryResponse> {
    return await this.integrationsService.get(params, token, id);
  }

  async post_product_category(payload: ProductCategoryRequestDto, token: string, account: Account) {
    try {
      return await this.integrationsService
        .post(payload, token)
        .then(async (response) => {
          if (response.code !== 'S00000') {
            throw new Error(response.message);
          } else {
            const newData = new this.productCategoryModel({
              core_product_category_id: response.payload.id,
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

  async patch_product_category(payload: ProductCategoryUpdateRequestDto, token: string, id) {
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

  async delete_product_category(id: string, merchant_id: string, token: string) {
    try {
      const response = {
        transaction_classify: "INVENTORY_PRODUCT_CATEGORY",
        message: "deleted category success",
        payload: {
          trace_id: true
        }
      }
      await this.integrationsService.delete(id, token, merchant_id);
      await this.productCategoryModel.findOneAndUpdate(
        {
          core_product_category_id: id,
        },
        { deleted_at: Date.now() },
      );
      return response;
    } catch (err) {
      throw err;
    }
  }
}
