import { ApplicationService } from '@/application/services/application.service';
import { GlobalResponse } from '@/dtos/response.dto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Location, LocationDocument } from './models/location.model';
import { LocalFileDto } from './utils/FilterDT/file.dto';

@Injectable()
export class LocationService {

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    private appsService: ApplicationService,
  ) {
    //
  }

  async import_location(
    data_source: string,
    fileData: LocalFileDto,
    account: any = null,
  ):Promise<any>{
    const response = new GlobalResponse();
    response.transaction_classify = 'LOCATION_IMPORT';
    await this.csvToJson(data_source,fileData.path,account)
    response.message = 'Import Location successfully';
    response.statusCode = HttpStatus.OK;
    return response;
  }

  protected async checkAvailName(parameter: any): Promise<boolean> {
    return (
      (await this.locationModel
        .findOne({
          $and: [parameter, { deleted_at: null }],
        })
        .exec()) === null
    );
  }

  protected async genereteLocation(data_source: string,object: any,account: any = null): Promise<any>{
    let id_area = '';
    let id_region = '';
    const typeIDArea = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_LOCATION_AREA'),
    );
      
    const idHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_ID_LOCATION_HQ'),
    );
      
    //Check Area
    const checkLocation = await this.locationModel.findOne({name: object.AREA_NAME,type: typeIDArea,parent: idHQ}).exec()
    if(!checkLocation){
      const data = {
        name: object.AREA_NAME,
        data_source: data_source,
        type: typeIDArea,
        parent: idHQ,
      }
      const checkArea = await this.checkAvailName({
        name: object.AREA_NAME
      })
      if(checkArea){
        const newArea = new this.locationModel({
          ...data,
          created_by: account.core_payload?.user_profile._id
        })
        await newArea.save().then(async(res) =>{
          id_area = res._id
        })
        .catch((e) =>{
          throw new Error(e)
        })
      }
    }else{
      id_area = checkLocation._id
    }

    const typeIDRegion = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_LOCATION_REGION'),
    );
    
    //CheckRegion
    const checkRegion = await this.locationModel.findOne({name: object.REGION_DESC,type: typeIDRegion,parent: id_area}).exec()
    if(!checkRegion){
      const dataRegion = {
        name: object.REGION_DESC,
        data_source: data_source,
        type: typeIDRegion,
        parent: id_area,
        area: object.AREA_NAME,
        region: object.REGION_DESC,
        area_id: id_area,
      }
      const checAvailkRegion = await this.checkAvailName({
        name: object.REGION_DESC
      })
      if(checAvailkRegion){
        const newRegion = new this.locationModel({
          ...dataRegion,
          created_by: account.core_payload?.user_profile._id
        })
        await newRegion.save().then(async(res) =>{
          id_region = res._id
        })
        .catch((e) =>{
          throw new Error(e)
        })
      }
    }else{
      id_region = checkRegion._id
    }

    const typeIDCity = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_LOCATION_CITY'),
    );

    //Check City
    const checkCity = await this.locationModel.findOne({name: object.KOTA_NAME,type: typeIDCity,parent: id_region}).exec()
    if(!checkCity){
      const dataCity = {
        name: object.KOTA_NAME,
        data_source: data_source,
        type: typeIDCity,
        parent: id_region,
        area: object.AREA_NAME,
        region: object.REGION_DESC,
        city: object.KOTA_NAME,
        area_id: id_area,
        region_id: id_region
      }
      const checkAvailCity = await this.checkAvailName({
        name: object.KOTA_NAME
      })
      if(checkAvailCity){
        const newCity = new this.locationModel({
          ...dataCity,
          created_by: account.core_payload?.user_profile._id
        })
        await newCity.save().then(async() =>{
          
        })
        .catch((e) =>{
          throw new Error(e)
        })
      }
    }
  }

  protected async csvToJson(data_source:string,fileData: any,account: any = null): Promise<any>{
    const csv = require('csvtojson')
    const JsonArray = await csv().fromFile(fileData);
    for(const file of JsonArray){
      await this.genereteLocation(data_source,file,account)
    }
  }
}
