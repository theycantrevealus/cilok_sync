import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import { response } from 'express';
import * as fs from 'fs';
import mongoose, { Connection, Model } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location, LocationDocument } from '@/location/models/location.model';
import {
  LocationTemp,
  LocationTempDocument,
} from '@/location/models/location.temp.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';

import {
  LocationHris,
  LocationHrisDocument,
} from '../models/location.hris.model';

@Processor('location-queue')
export class LocationProcessor {
  private connection: Connection;
  private readonly locationModel: Model<LocationDocument>;
  private readonly locationTempModel: Model<LocationTempDocument>;
  private readonly locationHrisModel: Model<LocationHrisDocument>;
  private readonly lovModel: Model<LovDocument>;
  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(Location.name)
    locationModel: Model<LocationDocument>,

    @InjectModel(LocationTemp.name)
    locationTempModel: Model<LocationTempDocument>,

    @InjectModel(LocationHris.name)
    locationHrisModel: Model<LocationHrisDocument>,

    @InjectModel(Lov.name)
    lovModel: Model<LovDocument>,
  ) {
    this.connection = connection;
    this.locationModel = locationModel;
    this.locationTempModel = locationTempModel;
    this.locationHrisModel = locationHrisModel;
    this.lovModel = lovModel;
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is in progress now...`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is completed now...`);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    //
  }

  @Process('location-file-import-wow1')
  async importLoc2(job: Job) {
    // await this.locationTempModel.deleteMany().exec();
    const filePath = job.data.path as string;
    let proceedLoad = [];
    const updatedLoad = [];
    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovProvince = new mongoose.Types.ObjectId('643cf444c33b36f4eb4b8073');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const lovBranch = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bf');
    const lovCity = new mongoose.Types.ObjectId('63ede0e0df65223c4996c768');
    const perBatch = 30000;
    const timer = new TimeManagement();
    const startTime = timer.getTimezone('Asia/Jakarta');

    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');
    let currentRest = (arrayContent.length - 1) * 3;
    const errorer = [];
    console.log(currentRest);

    for (let i = 1; i < arrayContent.length; i++) {
      const explode = arrayContent[i].split(',');
      const filterLoad = [];

      console.log(explode);
      const [
        lac,
        cellId,
        longitude,
        latitude,
        area,
        region,
        prov,
        branch,
        city,
        dataSource,
      ] = explode;

      if (area && area !== '') {
        console.log(`Pushing Area : ${area}`);
        const filter = {
          name: area,
          data_source: dataSource,
          type: lovArea,
        };

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              name: area,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovArea,
              area: '',
              area_id: null,
              prov: '',
              prov_id: null,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,

              updated_at: new Date().toISOString(),
            },
            upsert: true,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (prov && prov !== '') {
        console.log(`Pushing Province : ${region}`);
        const filter = {
          name: prov,
          area: area,
          data_source: dataSource,
          type: lovProvince,
        };

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              name: prov,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovProvince,
              area: area,
              area_id: null,
              prov: '',
              prov_id: null,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,

              updated_at: new Date().toISOString(),
            },
            upsert: true,
          },
        });
        currentRest += 1;
      } else {
        currentRest -= 1;
      }

      if (region && region !== '') {
        console.log(`Pushing Region : ${region}`);

        const filter = {
          data_source: dataSource,
          area: area,
          name: region,
          type: lovRegion,
        };

        if (dataSource.toLowerCase() === 'lacima') {
          filter['prov'] = prov;
        }

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              name: region,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovRegion,
              area: area,
              area_id: null,
              prov: prov,
              prov_id: null,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (city && city !== '') {
        console.log(`Pushing City : ${city}`);

        proceedLoad.push({
          updateOne: {
            filter: {
              data_source: dataSource,
              area: area,
              prov: prov,
              region: region,
              type: lovCity,
            },
            update: {
              name: city,
              lac: +lac,
              cellId: cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovCity,
              area: area,
              area_id: null,
              prov: prov,
              prov_id: null,
              region: region,
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (branch && branch !== '') {
        console.log(`Pushing Branch : ${branch}`);

        proceedLoad.push({
          updateOne: {
            filter: {
              data_source: dataSource,
              area: area,
              region: region,
              type: lovBranch,
            },
            update: {
              name: branch,
              lac: +lac,
              cellId: cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovBranch,
              area: area,
              area_id: null,
              prov: '',
              prov_id: null,
              region: region,
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (
        proceedLoad.length >= perBatch ||
        (currentRest > 0 && currentRest <= perBatch)
      ) {
        // console.clear();
        console.log(`Batch #${proceedLoad.length}`);
        proceedLoad = await this.proceedBatch(proceedLoad)
          .then(async (response: any) => {
            if (currentRest <= perBatch) {
              currentRest = 0;
            } else {
              currentRest -= perBatch;
            }

            console.log(response.result);
            const countUpserted = response.result.upserted.length;
            const dataSetUpdate =
              countUpserted > 0 ? countUpserted : response.result.nModified;
            if (parseFloat(dataSetUpdate) > 0) {
              // Is new data
              for (let az = 0; az < filterLoad.length; az++) {
                const filter = { ...filterLoad[az] };
                console.log(filter);

                await this.locationModel
                  .findOne(filter)
                  .exec()
                  .then((result) => {
                    const { _id, area, data_source, name, prov, type } = result;

                    if (type.toString() === lovArea.toString()) {
                      updatedLoad.push({
                        updateMany: {
                          filter: {
                            area: name,
                            data_source: data_source,
                            name: { $exists: true },
                            area_id: null,
                          },
                          update: {
                            updated_at: new Date().toISOString(),
                            area_id: _id,
                            parent: _id,
                          },
                          // upsert: true,
                        },
                      });
                    } else if (type.toString() === lovProvince.toString()) {
                      if (data_source.toLowerCase() === 'lacima') {
                        updatedLoad.push({
                          updateMany: {
                            filter: {
                              area: area,
                              prov: name,
                              data_source: data_source,
                              name: { $exists: true },
                              prov_id: null,
                            },
                            update: {
                              updated_at: new Date().toISOString(),
                              prov_id: _id,
                              parent: _id,
                            },
                            // upsert: true,
                          },
                        });
                      }
                    } else if (type.toString() === lovRegion.toString()) {
                      const filter = {
                        area: area,
                        region: name,
                        data_source: data_source,
                        name: { $exists: true },
                        region_id: null,
                      };

                      const update = {
                        updated_at: new Date().toISOString(),
                        region_id: _id,
                        parent: _id,
                      };

                      if (data_source.toLowerCase() === 'lacima') {
                        if (result.hasOwnProperty('prov')) {
                          filter['prov'] = prov;
                        }
                      }

                      updatedLoad.push({
                        updateMany: {
                          filter: { ...filter },
                          update: { ...update },
                          // upsert: true,
                        },
                      });
                    }
                  });
              }
            }
            return [];
          })
          .catch((e) => {
            console.log(e);
            errorer.push(response);
            if (currentRest <= perBatch) {
              currentRest = 0;
            } else {
              currentRest -= perBatch;
            }
            return [];
          });

        if (currentRest === 0) {
          console.clear();
          console.log('Finished');
          console.log(`Data Set : ${arrayContent.length}`);
          console.log(errorer);
          console.log(`${startTime} - ${timer.getTimezone('Asia/Jakarta')}`);
          console.log(currentRest);

          console.log(updatedLoad);
          await this.proceedBatch(updatedLoad);
        }
        // await this.proceedBatch(updatedLoad);
      } else {
        //
      }

      console.log('filter load');
      console.log(filterLoad);
    }

    console.log(proceedLoad.length);
  }

  @Process('location-file-import-wow')
  async importLoc3(job: Job) {
    // await this.locationTempModel.deleteMany().exec();
    const filePath = job.data.path as string;
    let proceedLoad = [];
    const updatedLoad = [];
    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovProvince = new mongoose.Types.ObjectId('643cf444c33b36f4eb4b8073');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const lovBranch = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bf');
    const lovCity = new mongoose.Types.ObjectId('63ede0e0df65223c4996c768');
    const perBatch = 30000;
    const timer = new TimeManagement();
    const startTime = timer.getTimezone('Asia/Jakarta');

    console.clear();
    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');
    let currentRest = (arrayContent.length - 1) * 3;
    const errorer = [];
    // console.log(currentRest);

    let areaCount = 0,
      provCount = 0,
      regionCount = 0;
    let areaLoad = [];
    let provLoad = [];
    let regionLoad = [];

    console.log(`Start Process: ${arrayContent.length} rows`);
    console.log('-----------------------------------');
    let batch = 1;
    for (let i = 1; i < arrayContent.length; i++) {
      const explode = arrayContent[i].split(',');

      //console.log (explode);
      const [
        lac,
        cellId,
        longitude,
        latitude,
        area,
        region,
        prov,
        branch,
        city,
        dataSource,
      ] = explode;

      if (area && area !== '') {
        //console.log(`Pushing Area : ${area}`);
        const filter = {
          name: area,
          data_source: dataSource,
          type: lovArea,
        };

        //filterLoad.push(filter);
        areaLoad.push(filter);

        proceedLoad.push({
          updateOne: {
            filter: filter,
            update: {
              name: area,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovArea,
              area: '',
              area_id: null,
              prov: '',
              prov_id: null,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              parent: null,
              data_source: dataSource,
              updated_at: new Date().toISOString(),
            },
            upsert: true,
          },
        });
      }

      if (prov && prov !== '') {
        //console.log(`Pushing Province : ${region}`);
        const filter = {
          name: prov,
          area: area,
          data_source: dataSource,
          type: lovProvince,
        };

        //filterLoad.push(filter);
        provLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: filter,
            update: {
              name: prov,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovProvince,
              area: area,
              prov: '',
              prov_id: null,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              data_source: dataSource,
              updated_at: new Date().toISOString(),
            },
            upsert: true,
          },
        });
        currentRest += 1;
      }

      if (region && region !== '') {
        //console.log(`Pushing Region : ${region}`);

        const filter = {
          data_source: dataSource,
          area: area,
          name: region,
          type: lovRegion,
        };

        //if (dataSource.toLowerCase() === 'lacima') {
        //  filter['prov'] = prov;
        //}

        regionLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: filter,
            update: {
              name: region,
              lac: +lac,
              cellId: +cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovRegion,
              area: area,
              prov: prov,
              region: '',
              region_id: null,
              city: '',
              city_id: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      }

      if (city && city !== '') {
        //console.log(`Pushing City : ${city}`);

        proceedLoad.push({
          updateOne: {
            filter: {
              data_source: dataSource,
              area: area,
              // prov: prov,
              region: region,
              type: lovCity,
              name: city,
            },
            update: {
              name: city,
              lac: +lac,
              cellId: cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovCity,
              area: area,
              prov: prov,
              region: region,
              city: '',
              city_id: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      }

      if (branch && branch !== '') {
        //console.log(`Pushing Branch : ${branch}`);

        proceedLoad.push({
          updateOne: {
            filter: {
              data_source: dataSource,
              area: area,
              region: region,
              type: lovBranch,
              name: branch,
            },
            update: {
              name: branch,
              lac: +lac,
              cellId: cellId,
              longitude: longitude,
              latitude: latitude,
              adhoc_group: [],
              type: lovBranch,
              area: area,
              prov: '',
              prov_id: null,
              region: region,
              city: '',
              city_id: null,
              data_source: dataSource,
            },
            upsert: true,
          },
        });
      }

      if (proceedLoad.length > perBatch - 4) {
        await this.proceedBatch(proceedLoad);
        console.log(`Batch ${batch} insert ${proceedLoad.length} data...`);
        this.setChild(areaLoad, provLoad, regionLoad, batch).then((_batch) => {
          console.log(`Processing action set parent id for Batch#${_batch}...`);
        });

        areaCount += areaLoad.length;
        provCount += areaLoad.length;
        regionCount += areaLoad.length;

        proceedLoad = [];
        areaLoad = [];
        provLoad = [];
        regionLoad = [];
        batch++;
      }
    }

    // console.log('=========== INSERT ALL DATA');
    await this.proceedBatch(proceedLoad);
    console.log(`Batch ${batch} insert ${proceedLoad.length} data...`);

    await this.setChild(areaLoad, provLoad, regionLoad, batch);
    console.log(`Finish set parent id for Batch#${batch}...`);
    areaCount += areaLoad.length;
    provCount += areaLoad.length;
    regionCount += areaLoad.length;

    console.log('=====================');
    console.log(`Area = ${areaCount}`);
    console.log(`Prov = ${provCount}`);
    console.log(`Region = ${regionCount}`);
    console.log('---------------------');
    console.log(`${startTime} - ${timer.getTimezone('Asia/Jakarta')}`);
    batch = 1;
  }

  async setChild(areaLoad, provLoad, regionLoad, batch) {
    console.log(`Start set child for Batch#${batch}...`);
    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovProvince = new mongoose.Types.ObjectId('643cf444c33b36f4eb4b8073');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const tselDataSource = 'Telkomsel';
    const lacimaDataSource = 'LACIMA';

    const areaChildUpdate = [];
    for (let az = 0; az < areaLoad.length; az++) {
      const filter = areaLoad[az];

      const { _id, data_source, name, type } = await this.locationModel
        .findOne(filter)
        .exec();

      if (type.toString() === lovArea.toString()) {
        // set area id
        areaChildUpdate.push({
          updateMany: {
            filter: {
              $and: [
                {
                  area: name,
                  data_source: data_source,
                  name: { $exists: true },
                },
                { $or: [{ area_id: { $exists: false } }, { area_id: null }] },
              ],
            },
            update: {
              updated_at: new Date().toISOString(),
              area_id: _id,
            },
          },
        });

        // set parent
        areaChildUpdate.push({
          updateMany: {
            filter: {
              $and: [
                {
                  area: name,
                  data_source: data_source,
                  name: { $exists: true },
                },
                {
                  $or: [
                    { type: lovProvince, data_source: lacimaDataSource },
                    { type: lovRegion, data_source: tselDataSource },
                  ],
                },
                { $or: [{ parent: { $exists: false } }, { parent: null }] },
              ],
            },
            update: {
              updated_at: new Date().toISOString(),
              parent: _id,
            },
          },
        });
      }
    }
    // running async
    this.proceedBatch(areaChildUpdate).then((_) => {
      console.log(`Set Area as parent for Batch#${batch}...`);
    });

    const provChildUpdate = [];
    for (let az = 0; az < provLoad.length; az++) {
      const filter = provLoad[az];

      const { _id, area, data_source, name, type } = await this.locationModel
        .findOne(filter)
        .exec();

      if (type.toString() === lovProvince.toString()) {
        if (data_source.toLowerCase() === 'lacima') {
          provChildUpdate.push({
            updateMany: {
              filter: {
                $and: [
                  {
                    area: area,
                    prov: name,
                    data_source: data_source,
                    name: { $exists: true },
                  },
                  { $or: [{ prov_id: { $exists: false } }, { prov_id: null }] },
                ],
              },
              update: {
                updated_at: new Date().toISOString(),
                prov_id: _id,
              },
            },
          });

          provChildUpdate.push({
            updateMany: {
              filter: {
                $and: [
                  {
                    area: area,
                    prov: name,
                    data_source: data_source,
                    name: { $exists: true },
                    type: lovRegion,
                  },
                  {
                    $or: [{ parent: { $exists: false } }, { parent: null }],
                  },
                ],
              },
              update: {
                updated_at: new Date().toISOString(),
                parent: _id,
              },
            },
          });
        }
      }
    }
    // running async
    this.proceedBatch(provChildUpdate).then((_) => {
      console.log(`Set Prov as parent for Batch#${batch}...`);
    });

    const regionChildUpdate = [];
    for (let az = 0; az < regionLoad.length; az++) {
      const filter = regionLoad[az];

      const result = await this.locationModel.findOne(filter).exec();

      if (result.type.toString() === lovRegion.toString()) {
        const filterUpdate = {
          area: result.area,
          region: result.name,
          data_source: result.data_source,
          name: { $exists: true },
        };

        if (result.data_source.toLowerCase() === 'lacima') {
          if (result.prov !== undefined) {
            filterUpdate['prov'] = result.prov;
          }
        }

        /**
         * Update for data source:
         * - Telkomsel
         * - LACIMA (only have prov)
         */
        regionChildUpdate.push({
          updateMany: {
            filter: {
              $and: [
                {
                  ...filterUpdate,
                },
                {
                  $or: [{ region_id: { $exists: false } }, { region_id: null }],
                },
              ],
            },
            update: {
              updated_at: new Date().toISOString(),
              region_id: result._id,
              parent: result._id,
            },
          },
        });

        // For LACIMA and don't have prov
        regionChildUpdate.push({
          updateMany: {
            filter: {
              $and: [
                {
                  area: result.area,
                  region: result.name,
                  data_source: lacimaDataSource,
                  name: { $exists: true },
                  prov: { $exists: false },
                },
                {
                  $or: [{ region_id: { $exists: false } }, { region_id: null }],
                },
              ],
            },
            update: {
              updated_at: new Date().toISOString(),
              region_id: result._id,
              parent: result._id,
            },
          },
        });
      }
    }
    // running async
    this.proceedBatch(regionChildUpdate).then((_) => {
      console.log(`Set Region as parent for Batch#${batch}...`);
    });

    return batch;
  }

  async proceedBatch(bulkData: any): Promise<any> {
    return await this.locationModel
      .bulkWrite(bulkData, { ordered: true })
      .then((respone) => {
        return respone;
      });
  }

  @Process('location-file-import')
  async importLocation(job: Job): Promise<void> {
    const filePath = job.data.path as string;
    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const lovCity = new mongoose.Types.ObjectId('6303398c1ebff8837ae097cd');

    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');
    let bulkData = [];
    let insertedData = 0;
    let rowRead = 0;
    let rowReadNow = 0;
    const maxBulkInsert = 200;

    for (let i = 1; i < arrayContent.length - 1; i++) {
      const explode = arrayContent[i].split(',');
      let [
        lac,
        cellId,
        longitude,
        latitude,
        area,
        region,
        prov,
        city,
        dataSource,
      ] = explode;
      dataSource = dataSource;

      // check for area is available or not
      let areaData;
      if (area != undefined) {
        area = area.toUpperCase();
        const cond = {
          data_source: dataSource,
          name: area,
          type: lovArea,
          area: null,
          region: null,
          city: null,
        };

        areaData = await this.locationModel.findOne(cond).then((results) => {
          return results;
        });

        if (!areaData) {
          // check in bulk array
          bulkData.some(function (obj) {
            if (
              obj.name == cond.name &&
              obj.type == cond.type &&
              obj.data_source == cond.data_source &&
              obj.area == null &&
              obj.region == null &&
              obj.city == null
            ) {
              areaData = obj;
              return true;
            }
          });

          if (!areaData) {
            areaData = {
              _id: new mongoose.Types.ObjectId(),
              ...cond,
            };

            bulkData.push(areaData);
          }
        }
      }

      // check for region is available or not
      let regionData;
      if (region != undefined) {
        region = region.toUpperCase();
        const cond = {
          data_source: dataSource,
          type: lovRegion,
          name: region,
          area: area,
          region: null,
          city: null,
        };

        regionData = await this.locationModel.findOne(cond).then((results) => {
          return results;
        });

        if (!regionData) {
          // check in bulk array
          bulkData.some(function (obj) {
            if (
              obj.name == cond.name &&
              obj.type == cond.type &&
              obj.area == cond.area &&
              obj.data_source == cond.data_source &&
              obj.region == null &&
              obj.city == null
            ) {
              regionData = obj;
              return true;
            }
          });

          if (!regionData) {
            regionData = {
              _id: new mongoose.Types.ObjectId(),
              parent: areaData._id,
              area_id: areaData._id,
              ...cond,
            };

            bulkData.push(regionData);
          }
        }

        // check for region is available or not
        let cityData;
        if (city != undefined) {
          city = city.toUpperCase();
          const cond = {
            data_source: dataSource,
            type: lovCity,
            name: city,
            region: region,
            area: area,
            city: null,
          };

          cityData = await this.locationModel.findOne(cond).then((results) => {
            return results;
          });

          if (!cityData) {
            // check in bulk array
            bulkData.some(function (obj) {
              if (
                obj.name == cond.name &&
                obj.type == cond.type &&
                obj.area == cond.area &&
                obj.region == cond.region &&
                obj.data_source == cond.data_source &&
                obj.city == null
              ) {
                cityData = obj;
                return true;
              }
            });

            if (!cityData) {
              cityData = {
                _id: new mongoose.Types.ObjectId(),
                parent: regionData._id,
                area_id: areaData._id,
                region_id: regionData._id,
                ...cond,
              };

              bulkData.push(cityData);
            }
          }
        }
      }

      if (bulkData.length == maxBulkInsert) {
        insertedData += bulkData.length;

        bulkData = await this.bulkInsertLocation(bulkData);
        console.log(`Done row inserted ${insertedData}`);
      }

      rowRead++;
      if (rowRead == 1000) {
        bulkData = await this.bulkInsertLocation(bulkData);
        console.log(`Done row inserted ${insertedData}`);

        rowReadNow += rowRead;
        console.log(`Row read: ${rowReadNow}`);
        rowRead = 0;
      }
    }
    if (bulkData.length > 0) {
      insertedData += bulkData.length;

      await this.bulkInsertLocation(bulkData);
      console.log(`Done row inserted ${insertedData}`);
    }
  }

  /**
   * Will return empty array for identify transaction has success
   * @param bulkData
   */
  async bulkInsertLocation(bulkData: Array<any>): Promise<Array<any>> {
    await this.locationModel
      .bulkWrite(
        bulkData.map((doc) => {
          return {
            updateOne: {
              filter: {
                _id: doc._id,
              },
              update: doc,
              upsert: true,
            },
          };
        }),
      )
      .then(() => {
        bulkData = [];
      });

    return bulkData;
  }

  /**
   * SIAD & HRIS
   */
  @Process('location-hris-siad-file-import')
  async importLocSiadHris(job: Job) {
    const filePath = job.data.path as string;
    const proceedLoad = [];
    const errorLoad = [];

    console.log('Reading file: ', filePath);

    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');

    for (let i = 1; i < arrayContent.length; i++) {
      const explode = arrayContent[i].split(',');
      // console.log(explode);

      const areaTypeString = explode[8];
      const areaType = await this.lovModel.findOne({
        group_name: 'LOCATION_TYPE',
        set_value: {
          $regex: new RegExp(`${areaTypeString}`, 'i'),
        },
      });

      // console.log(areaTypeString);
      // console.log(areaType);

      const locationQuery = {
        data_source: 'Telkomsel',
      };

      if (areaTypeString == 'HQ') {
        locationQuery['data_source'] = 'BOTH';
        locationQuery['name'] = 'HQ';
      } else if (areaTypeString == 'Area') {
        locationQuery['name'] = explode[5];
      } else if (areaTypeString == 'Region') {
        locationQuery['area'] = explode[5];
        locationQuery['name'] = explode[6];
      } else if (areaTypeString == 'Branch') {
        locationQuery['area'] = explode[5];
        locationQuery['region'] = explode[6];
        locationQuery['name'] = explode[7];
      } else {
        errorLoad.push(`[${i + 1}] Area Type: '${areaTypeString}' not found!`);
        continue;
      }

      // console.log(locationQuery);

      const localLocation = await this.locationModel.findOne({
        type: areaType._id,
        ...locationQuery,
      });

      // ada di local location?
      const remark_src = `${explode[1]}|${explode[2]}|${explode[3]}`;
      // console.log(remark_src, ' - ', localLocation?._id?.toString());

      if (localLocation) {
        const data = {
          data_source: explode[0],
          name: explode[3],
          location: localLocation._id,
          type: areaType._id,
          remark: {
            src: remark_src,
            dst: `${localLocation.area}|${localLocation.region}|${localLocation.name}`,
          },
        };

        const result = await this.locationHrisModel.findOneAndUpdate(
          {
            'remark.src': remark_src,
          },
          data,
          { upsert: true },
        );

        proceedLoad.push(result);
      } else {
        errorLoad.push(
          `[${i + 1}] Remark SRC: '${remark_src}' data not complete!`,
        );
      }
    }

    console.log('=====================');
    console.log(`Success = ${proceedLoad.length}`);
    console.log(`Error = ${errorLoad.length}`);
    console.log('=====================');
    console.log(`Total = ${arrayContent.length + 1}`);
  }

  @Process('location-timezone-import')
  async importLocationTimezone(job: Job) {
    console.log('Importing timezone...');
    const filePath = job.data.path as string;
    const dataSource = 'LACIMA';
    const perBatch = 30000;

    const timer = new TimeManagement();
    const startTime = timer.getTimezone('Asia/Jakarta');

    const lovArea = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785bd');
    const lovProvince = new mongoose.Types.ObjectId('643cf444c33b36f4eb4b8073');
    const lovRegion = new mongoose.Types.ObjectId('62ffc0fc8a01008799e785be');
    const lovCity = new mongoose.Types.ObjectId('63ede0e0df65223c4996c768');

    if (!fs.existsSync(filePath)) {
      console.log(`File not exists : ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const arrayContent = content.split('\n');
    let currentRest = (arrayContent.length - 1) * 3;

    let proceedLoad = [];
    for (let i = 1; i < arrayContent.length; i++) {
      const explode = arrayContent[i].split(',');
      const filterLoad = [];

      let [
        area,
        region,
        prov,
        city,
        timezone,
      ] = explode;

      if (area && area !== '') {
        const filter = {
          name: area,
          data_source: dataSource,
          type: lovArea,
        };

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              timezone: timezone,
              updated_at: new Date().toISOString(),
            },
            upsert: false,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (prov && prov !== '') {
        const filter = {
          name: prov,
          area: area,
          data_source: dataSource,
          type: lovProvince,
        };

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              timezone: timezone,
              updated_at: new Date().toISOString(),
            },
            upsert: false,
          },
        });
        currentRest += 1;
      } else {
        currentRest -= 1;
      }

      if (region && region !== '') {
        const filter = {
          data_source: dataSource,
          area: area,
          name: region,
          type: lovRegion,
        };

        if (dataSource.toLowerCase() === 'lacima') {
          filter['prov'] = prov;
        }

        filterLoad.push(filter);
        proceedLoad.push({
          updateOne: {
            filter: {
              ...filter,
            },
            update: {
              timezone: timezone,
              updated_at: new Date().toISOString(),
            },
            upsert: false,
          },
        });
      } else {
        currentRest -= 1;
      }

      if (city && city !== '') {
        proceedLoad.push({
          updateOne: {
            filter: {
              data_source: dataSource,
              area: area,
              prov: prov,
              region: region,
              type: lovCity,
              name: city,
            },
            update: {
              timezone: timezone,
              updated_at: new Date().toISOString(),
            },
            upsert: false,
          },
        });
      } else {
        currentRest -= 1;
      }
    }

    await this.proceedBatch(proceedLoad);
    console.log(`Import location timezone proceed data: ${proceedLoad.length}`);
  }
}
