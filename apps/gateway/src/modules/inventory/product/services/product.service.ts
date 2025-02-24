import {BadRequestException, HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {ObjectId} from 'bson';
import {Model} from 'mongoose';

import {Account} from '@/account/models/account.model';
import {InventoryQuery} from '@/inventory/dtos/inventory.query';
import {Location, LocationDocument} from '@/location/models/location.model';
import {StockService} from '@/stock/services/stock.service';

import {
  ProductRequestDto,
  ProductUpdateRequestDto,
} from '../dtos/product.request';
import {ProductIntegration} from '../integrations/product.integration';
import {
  ProductInventory,
  ProductInventoryDocument,
} from '../models/product.model';
import {throwError} from 'rxjs';
import {SystemConfig, SystemConfigDocument} from '@/application/models/system.config.model';
import {Stock, StockDocument} from "@/stock/models/stock.model";

@Injectable()
export class ProductService {
  private integrationsService: ProductIntegration;
  private stockService: StockService;

  constructor(
    integrationsService: ProductIntegration,
    stockService: StockService,
    @InjectModel(ProductInventory.name)
    private productModel: Model<ProductInventoryDocument>,
    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
  ) {
    this.integrationsService = integrationsService;
    this.stockService = stockService;
  }

  async get_product(params: InventoryQuery, token: string): Promise<any> {
    return await this.integrationsService.get(params, token);
  }

  async get_product_by_id(
    params: InventoryQuery,
    token: string,
    id: string,
  ): Promise<any> {
    return await this.integrationsService.get(params, token, id);
  }

  async post_product(
    payload: ProductRequestDto,
    token: string,
    account: Account,
  ) {
    const category = await this.systemConfigModel.findOne({param_key: "DEFAULT_MERCHANDISE_CATEGORY"});

    if (!category) {
      throw new BadRequestException("Please setup the default category on the system config with param_key DEFAULT_MERCHANDISE_CATEGORY, before using this service!");
    }

    const merchant_id = await this.systemConfigModel.findOne({param_key: "DEFAULT_TELKOMSEL_MERCHANT_ID"});

    if (!merchant_id) {
      throw new BadRequestException("Please setup the default merchant_id on the system config with param_key DEFAULT_TELKOMSEL_MERCHANT_ID, before using this service!");
    }

    payload.category_id = category.param_value.toString();
    payload.merchant_id = merchant_id.param_value.toString();
    payload.type = "Product";
    payload.locale = "en-US";
    payload.action = "upload_image";
    payload.status = "Active";

    return await this.integrationsService
      .post(payload, token)
      .then(async (response) => {
        if (response.code !== 'S00000') {
          throw new BadRequestException(response.message);
        } else {
          const newData = new this.productModel({
            core_product_id: response.payload.id,
            core_version: 0,
            ...payload,
            created_by: account,
          });
          return await newData
            .save()
            .catch((e: Error) => {
              throw new BadRequestException(e.message);
            })
            .then(async () => {
              try {
                const location = await this.getLocationHQ();
                await this.stockService.add(
                  {
                    location: location._id,
                    product: newData._id,
                    qty: (payload.qty) ? payload.qty : 0,
                  },
                  account,
                  true
                );
              } catch (e) {
                throw new Error(e.message);
              } finally {
                response.transaction_classify = 'INVENTORY_PRODUCT';
                response.message = 'Add product success';
                return response;
              }
            });
        }
      })
      .catch((e) => {
        console.log(e.response);
        throw new BadRequestException((e.response.response) ? e.response.response.data : e.message);
      });
  }

  async patch_product(
    payload: ProductUpdateRequestDto,
    token: string,
    id: string,
  ) {
    const __v = payload.__v + 1;
    const product = await this.productModel.findById(new ObjectId(id));
    payload.merchant_id = product.merchant_id;

    if(payload.qty < product.qty) {
      throw new BadRequestException('Quantity cannot smaller than quantity initial')
    }
    try {
    const newBalance = payload.qty - product.qty
    return await this.stockModel.updateOne({product: product?._id,keyword: null},{$inc: {balance: newBalance}})
        .then(async() =>{
          return await this.integrationsService
          .patch(payload, token, product.core_product_id)
              .then(async (response) => {
                if (response.code !== 'S00000') {
                  throw new Error(response.message);
                } else {
                  payload.__v = __v;
                  payload.core_version = __v;
                  try {
                    await this.productModel.updateOne({ _id: new ObjectId(id)}, { ...payload });
                  } catch (error) {
                    throw new BadRequestException(error?.message)
                  }
                  response.payload = {
                    trace_id: true,
                  };
                  return response;
                }
              }).catch(async(e) => {
                await this.stockModel.updateOne({product: product?._id,keyword: null},{$inc: {balance: -newBalance}})
                .then((a) => a)
                .catch((error) => {
                  throw new BadRequestException(error?.message)
                })
                throw new BadRequestException(e.message)
              });
        }).catch((e) => {
          throw new BadRequestException(e?.message)
        });
    } catch (e) {
      throw new BadRequestException(e?.response?.response?.data)
    }
  }

  async delete_product(id: string, merchant_id: string, token: string) {
    try {
      const response = await this.integrationsService.delete(
        id,
        token,
        merchant_id,
      );
      await this.productModel.findOneAndUpdate(
        {
          core_product_id: id,
        },
        {deleted_at: Date.now()},
      );
      return response;
    } catch (err) {
      throw err;
    }
  }

  async get_product_prime(param: any): Promise<any> {
    return await this.stockService.prime(param);
  }

  async get_product_by_id_local(_id: string, token: string) {
    return await this.prime_id(_id, token);
  }

  // get location
  async getLocationHQ() {
    return await this.locationModel.findOne({name: 'HQ'}).lean();
  }

  async prime_id(id: string, token: string) {
    const query = [];

    query.push({
      $match: {
        $and: [
          {
            product: new ObjectId(id),
            keyword: null
          }
        ]
      },
    });


    query.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location',
      },
    });

    query.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productinventories',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    });

    query.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: false,
      },
    });

    query.push({
      $lookup: {
        from: 'productcategories',
        localField: 'product.category_id',
        foreignField: 'core_product_category_id',
        as: 'product.category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.category',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productsubcategories',
        localField: 'product.sub_category_id',
        foreignField: 'core_product_subcategory_id',
        as: 'product.sub_category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.sub_category',
        preserveNullAndEmptyArrays: true,
      },
    });
    const data = await this.stockModel.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        data: data,
      },
    };
  }
}
