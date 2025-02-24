import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { isJSON } from 'class-validator';
import { error } from 'console';
import * as fs from 'fs';
import { Connection } from 'mongoose';
import { Command, Option, Positional } from 'nestjs-command';
const { EJSON } = require('bson');
@Injectable()
export class CLIService {
  private uri = '';
  private colls: any[] = [];

  constructor(@InjectConnection() private readonly connection: Connection) {}

  // async preparation() {
  //   await this.connect(this.uri)
  //     .then(async (e) => {
  //       console.log('Connected');
  //       this.colls = await this.populate_collection(e).then((a: any[]) => {
  //         return a;
  //       });
  //     })
  //     .catch((e) => {
  //       console.log('Failed to connect', e);
  //     });
  // }
  //
  // async populate_collection(mongooseCo) {
  //   return new Promise(async (resolve, reject) => {
  //     console.log('Get here');
  //     await mongooseCo.db
  //       .listCollections()
  //       .toArray()
  //       .then((collections, error) => {
  //         if (error) {
  //           reject(error);
  //         }
  //
  //         const names = collections.map((col) => col.name);
  //         resolve(names);
  //       })
  //       .catch((e) => {
  //         console.log('Sth wrong here');
  //       });
  //   });
  // }
  //
  // async get_data(mongooseCo, collection) {
  //   return new Promise(async (resolve, reject) => {
  //     await this.connect(this.uri).then(async (e) => {
  //       const query = {};
  //       await e.db
  //         .collection(collection)
  //         .find(query)
  //         .toArray(function (err, result) {
  //           if (err) reject(err);
  //           resolve(result);
  //         });
  //     });
  //   });
  // }

  @Command({
    command: 'seed:export <data>',
    describe: 'Get all collections',
  })
  async export(
    @Positional({
      name: 'data',
      describe: '???',
      type: 'string',
    })
    data: string,
  ) {
    // await this.connect(this.uri)
    //   .then(async () => {
    //     console.log('Connected');
    //   })
    //   .catch((e) => {
    //     throw new Error(e);
    //   });
    // return Promise.resolve().then(async () => {
    //   await this.preparation()
    //     .then(async () => {
    //       this.colls.map(async (a) => {
    //         await this.get_data(mongoose.connection, a)
    //           .then((b) => {
    //             const data = EJSON.stringify(b, null, 2, { relaxed: false });
    //             if (isJSON(data)) {
    //               console.warn('Exporting seed...');
    //               fs.writeFile(
    //                 `${process.env.SEEDS_DIR}/${a}.json`,
    //                 data,
    //                 function (err) {
    //                   if (err) {
    //                     return console.error(err);
    //                   }
    //                   console.info(`${a} exported!`);
    //                 },
    //               );
    //             } else {
    //               console.error('Invalid JSON data format');
    //             }
    //           })
    //           .catch((a) => {
    //             console.log('Get data error', a);
    //           });
    //       });
    //     })
    //     .catch((e) => {
    //       console.log('Connection error', e);
    //     });
    // });
  }

  @Command({
    command: 'seed:manager <collection>',
    describe: 'Export / import current data from mapped collection',
  })
  async seed(
    @Positional({
      name: 'collection',
      describe: 'collection to be exported',
      type: 'string',
    })
    collection: string,
    @Option({
      name: 'mode',
      describe: 'exp = exmport, imp = import',
      alias: 'm',
      type: 'string',
      default: 'exp',
      required: true,
    })
    mode: string,
    @Option({
      name: 'replace',
      describe:
        'if set true it will delete old data and replace with seed data(s)',
      alias: 'r',
      type: 'boolean',
      default: false,
      required: false,
    })
    replace: boolean,
  ): Promise<any> {
    return Promise.resolve().then(async () => {
      // if (this.serviceLib[collection]) {
      //   console.warn('Generating data...');
      //   const raw = await this.serviceLib[collection].seed(
      //     replace,
      //     mode === 'exp',
      //   );
      //   if (mode === 'exp') {
      //     const data = EJSON.stringify(raw, null, 2, { relaxed: false });
      //     if (isJSON(data)) {
      //       console.warn('Exporting seed...');
      //       fs.writeFile(
      //         `${process.env.SEEDS_DIR}/${collection}.json`,
      //         data,
      //         function (err) {
      //           if (err) {
      //             return console.error(err);
      //           }
      //           console.info(`${collection} exported!`);
      //         },
      //       );
      //     } else {
      //       console.error('Invalid JSON data format');
      //     }
      //   } else {
      //     await this.preparation();
      //   }
      // } else {
      //   // TODO : No collection anymore or create new handler
      // }
    });
  }
}
