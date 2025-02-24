import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SystemConfig, SystemConfigDocument } from "../models/system.config.model";

@Injectable()
export class CallApiConfigService {
  constructor(
    @InjectModel(SystemConfig.name)
    public systemConfigModel: Model<SystemConfigDocument>,
  ) { }

  public async callApiIsEnabled(nameApi: string): Promise<boolean> {
    const config = await this.systemConfigModel.findOne({ param_key: nameApi });
    if (config && config.param_value) {
      console.log(`${nameApi} is active!`);
      return true;
    } else {
      console.log(`Configuration for call api ${nameApi} is disabled, for Activated you can add on SystemConfig = { param_key : '${nameApi}', param_value : true } !`);
      return false;
    }
  }

  public async callConfig(name: string): Promise<any> {
    const config = await this.systemConfigModel.findOne({ param_key: name });
    if (config && config.param_value) {
      return config.param_value
    } else {
      console.log(`Configuration for call ${name} is disabled!`);
      return false;
    }
  }
}
