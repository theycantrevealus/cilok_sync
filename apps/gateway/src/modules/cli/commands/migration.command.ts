/* eslint-disable prettier/prettier */
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { readdirSync } from 'fs';
import * as fs from 'fs';
import mongoose, { Connection } from 'mongoose';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from 'winston';
const { EJSON } = require('bson');
const process = require('process');

interface MigrationCommandOptions {
  string?: string;
  boolean?: boolean;
  number?: number;
}

@Command({ name: 'migrate', description: 'A parameter parse' })
export class MigrationCommand extends CommandRunner {
  private readonly _rootFile = this.configService.get<string>('seed.location');

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super();
  }

  async run(
    passedParam: string[],
    options?: MigrationCommandOptions,
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
    flags: '-a --targetFolderName [targetFolderName]',
    description: 'Migrate data / insert data from tbp to prd',
  })
  async restoreCollection(targetFolderName: string) {
    try {
      await this.startConnection();

      const db                    = mongoose.connection;
      const targetFolder          = `${this._rootFile}/${targetFolderName}`;
      const migrationFolders      = await this.readFolders(targetFolder);
      const newestMigrationFolder = migrationFolders[migrationFolders.length - 1];
      const migrationFiles        = fs.readdirSync(`${targetFolder}/${newestMigrationFolder}`);

      for (const fileName of migrationFiles) {
        const fileContent       = fs.readFileSync(`${targetFolder}/${newestMigrationFolder}/${fileName}`, 'utf8');
        const collectionName    = fileName.replace('.json', '');
        const collection        = db.collection(collectionName);
        const documents         = EJSON.parse(fileContent);
        const isDocumentsExist  = documents.length > 0;

        if (isDocumentsExist) {
          try {
            await collection.insertMany(documents);
          } catch (error) {
            await db.close();

            console.error({
              function: `insert data to ${collectionName}'s collection`,
              message: error.message,
            });

            process.exit(1);
          }
        }
      }

      console.log('newestMigrationFolder', newestMigrationFolder);
      console.log('success migrate files', migrationFiles);

      await db.close();

      process.exit(0);
    } catch (error) {
      console.error({
        function: `error migration`,
        message: error.message,
      });
      process.exit(1);
    }
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
    return val;
  }

  @Option({
    flags: '-b, --boolean [boolean]',
    description: 'A boolean parser',
  })
  parseBoolean(val: string): boolean {
    return JSON.parse(val);
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

  private readFolders = async (
    targetFolder: string,
  ): Promise<Array<string>> => {
    return readdirSync(targetFolder, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  };

  private startConnection = async (): Promise<void> => {
    mongoose.set('strictQuery', false);
    await mongoose.connect(this.configService.get<string>('mongo.uri'));
  };
}
