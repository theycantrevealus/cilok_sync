/* eslint-disable prettier/prettier */
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { isJSON } from 'class-validator';
import * as fs from 'fs';
import mongoose, { Connection } from 'mongoose';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from 'winston';
const { EJSON } = require('bson');
const moment = require('moment-timezone');
const process = require('process');

interface SeedCommandOptions {
  string?: string;
  boolean?: boolean;
  number?: number;
}

@Command({ name: 'seed', description: 'Data seed manager' })
export class Seed extends CommandRunner {
  private readonly _targetCollectionToRestore: Array<string> = [
    'authorizations', // gada created_at nya (even itu d schemanya jg) -> handling manual
    'callback_auth', // gada created_at nya -> ada created_at di schema nya
    'channels',
    'cronconfigs', // cuman ada updatedAt -> need confirm apakah saat pertama kali create data cronconfigs itu si updatedAt nya auto ter-create juga?
    'customertiers',
    'location_hris', // gada data di hris -> handling manual
    'locations',
    'lovs',
    'notificationtemplates', // gada created_at nya (even itu d schemanya jg) -> handling manual
    'systemconfigs', // gada created_at nya (even itu d schemanya jg) -> handling manual
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super();
  }

  async run(
    passedParam: string[],
    options?: SeedCommandOptions,
  ): Promise<void> {
    if (options?.boolean !== undefined && options?.boolean !== null) {
      this.runWithBoolean(passedParam, options.boolean);
    } else if (options?.number) {
      this.runWithNumber(passedParam, options.number);
    } else if (options?.string) {
      this.runWithString(passedParam, options.string);
    } else {
      this.runWithNone(passedParam);
    }
  }

  @Option({
    flags: '-r --target [target]',
    description: 'Restore specific target environment',
  })
  async restoreCollection(target: string) {
    try {
      let query = {};
      await this.startConnection();

      const restoreDate       = this.getTimezone('Asia/Jakarta');
      const targetFolderPath  = `${this.configService.get<string>('seed.location')}/${target}`;
      const savedFilePath     = `${targetFolderPath}/${restoreDate}`;

      this.createTargetFolder(targetFolderPath);

      this.logger.warn(`Restoring collection on ${target}...`);

      const isFirstTimeBackup = await this.detectFirstTimeRestore(targetFolderPath);
      console.log('isFirstTimeBackup', isFirstTimeBackup);

      if (!isFirstTimeBackup) {
        let lastBackup: any = await this.readFolders(targetFolderPath);
        lastBackup = lastBackup[lastBackup.length - 1];
        console.log('lastBackup', lastBackup);

        query = { created_at: { $gt: lastBackup } };
      }

      console.log('query', query);

      const connection = mongoose.connection;
      const db = connection.db;
      const listOfCollections = await db.listCollections().toArray();

      for (const collections of listOfCollections) {
        const collectionName = collections.name;
        const isCollectionNeedToRestore = this._targetCollectionToRestore.includes(collectionName);

        if (isCollectionNeedToRestore) {
          const documents = await db.collection(collectionName).find(query).toArray();
          console.log(`Exporting ${collectionName}`);

          const data = EJSON.stringify(documents, null, 2, { relaxed: false });

          if (isJSON(data)) {
            this.createTargetFolder(savedFilePath);

            fs.writeFile(
              `${savedFilePath}/${collectionName}.json`,
              data,
              function (err) {
                if (err) {
                  return console.error(err);
                }
                console.info(`${collectionName} exported!`);
                console.log(
                  '==================================================================================\n\n',
                );
              },
            );
          } else {
            console.error('Invalid JSON data format');
          }
        }
      }

      console.log('==== success restore files ====');

      await connection.close();

      process.exit(0);
    } catch (error) {
      console.error({
        function: `error restore`,
        message: error.message,
      });

      process.exit(1);
    }

    // this.logger.warn(`Restoring collection on ${target}...`);
    // const mongoose = require('mongoose');
    // mongoose.set('strictQuery', false);
    // await mongoose.connect(this.configService.get<string>('mongo.uri'));
    // await mongoose.connection.db
    //   .listCollections()
    //   .toArray()
    //   .then(async (collections, error) => {
    //     if (error) {
    //       console.error(error);
    //     }

    //     await mongoose.connection.close();

    //     await Promise.all(
    //       collections.map(async (col) => {
    //         await mongoose.connect(this.configService.get<string>('mongo.uri'));
    //         await mongoose.connection.db
    //           .collection(col.name)
    //           .find({})
    //           .toArray()
    //           .then(async (dataResult) => {
    //             if (dataResult.length > 0) {
    //               console.log(`Exporting ${col.name}`);
    //               const data = EJSON.stringify(dataResult, null, 2, {
    //                 relaxed: false,
    //               });
    //               if (isJSON(data)) {
    //                 fs.writeFile(
    //                   `${this.configService.get<string>(
    //                     'seed.location',
    //                   )}/${target}/${col.name}.json`,
    //                   data,
    //                   function (err) {
    //                     if (err) {
    //                       return console.error(err);
    //                     }
    //                     console.info(`${col.name} exported!`);
    //                     console.log(
    //                       '==================================================================================\n\n',
    //                     );
    //                   },
    //                 );
    //               } else {
    //                 console.error('Invalid JSON data format');
    //               }
    //             }
    //           });
    //       }),
    //     ).then(async () => {
    //       await mongoose.connection.close();
    //     });
    //   });
    // return;
  }

  @Option({
    flags: '-n, --number [number]',
    description: 'A basic number parser',
  })
  parseNumber(val: string): number {
    return Number(val);
  }

  @Option({
    flags: '-s, --string [string]',
    description: 'A string return',
  })
  parseString(val: string): string {
    this.logger.warn('Test');
    return val;
  }

  @Option({
    flags: '-b, --boolean [boolean]',
    description: 'A boolean parser',
  })
  parseBoolean(val: string): boolean {
    return JSON.parse(val);
  }

  async connect() {
    const mongoose = require('mongoose');
    mongoose.set('strictQuery', false);
    await mongoose.connect(this.configService.get<string>('mongo.uri'));
    return mongoose.connection;
  }

  runWithString(param: string[], option: string): void {
    this.logger.verbose({ param, string: option });
  }

  runWithNumber(param: string[], option: number): void {
    this.logger.verbose({ param, number: option });
  }

  runWithBoolean(param: string[], option: boolean): void {
    this.logger.verbose({ param, boolean: option });
  }

  runWithNone(param: string[]): void {
    this.logger.verbose({ param });
  }

  private detectFirstTimeRestore = async (targetFolder: string): Promise<boolean> => {
    try {
      const directory = fs.opendirSync(targetFolder);
      const entry = await directory.read();
      await directory.close();

      return entry === null;
    } catch (error) {
      return false;
    }
  };

  private readFolders = async (targetFolder: string): Promise<Array<string>> => {
    return fs.readdirSync(targetFolder, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  };

  private createTargetFolder = (targetFolder: string): void => {
    fs.mkdirSync(`${targetFolder}`, {
      recursive: true,
    });
  };

  private getTimezone = (target) => {
    return moment().tz(target).format('YYYY-MM-DDTHH:mm:ss.sss');
  };

  private startConnection = async (): Promise<void> => {
    mongoose.set('strictQuery', false);
    await mongoose.connect(this.configService.get<string>('mongo.uri'));
  };
}
