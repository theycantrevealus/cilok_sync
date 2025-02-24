import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { isJSON } from 'class-validator';
import { FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import * as rl from 'readline-specific';
import * as Validator from 'validatorjs';

import { rangeArray } from '../../gateway/src/helper';
import { LoggerService } from './logger.service';

@Controller()
export class LoggerController {
  constructor(private readonly loggerService: LoggerService) { }

  @Get('log')
  @ApiQuery({
    name: 'filename',
    example: 'gateway_2023_7_2.log',
  })
  @ApiQuery({
    name: 'date',
    example: '',
  })
  @ApiQuery({
    name: 'lazyEvent',
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
  })
  async getFile(
    @Query('lazyEvent') lazyEvent,
    @Query('filename') filename,
    @Query('date') targetDate,
    @Res() response: FastifyReply,
  ) {
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(lazyEvent);
      const x = parsedData.first;
      const y = parsedData.rows;
      const filters = parsedData.filters;
      let dataSet = [];

      if (
        fs.existsSync(
          path.join(process.cwd(), `logs/${targetDate}/${filename}`),
        )
      ) {
        let count = 0;
        fs.createReadStream(
          path.join(process.cwd(), `logs/${targetDate}/${filename}`),
        ).on('data', function (chunk) {
          for (let i = 0; i < chunk.length; ++i) if (chunk[i] == 10) count++;
        });
        const ranged = await rangeArray(y, x);
        await rl.multilines(
          path.join(process.cwd(), `logs/${targetDate}/${filename}`),
          ranged,
          async function (err, res) {
            if (err) console.error(err);
            dataSet = Object.keys(res)
              .filter(
                (key) =>
                  res[key].match(new RegExp(filters.msisdn.value)) &&
                  res[key].match(new RegExp(filters.transaction_id.value)),
              )
              .map((key) => {
                try {
                  const data = JSON.parse(res[key]);
                  const rules = {
                    level: 'required|string',
                    // notif_operation: 'required|boolean',
                    // notif_customer: 'required|boolean',
                    transaction_id: 'string',
                    taken_time: 'numeric',
                    service: 'required|string',
                    'result.user_id': 'required',
                    step: 'required|string',
                    result: 'required',
                    param: 'required',
                  };
                  const validation = new Validator(data, rules);
                  return {
                    check: validation.passes(),
                    data: data,
                  };
                } catch (e) {
                  if (res.hasOwnProperty(key)) {
                    let json;
                    try {
                      json = res[key]

                      return {
                        check: true,
                        data: JSON?.parse(json),
                      };

                    } catch (error) {
                      response.status(HttpStatus.OK).send({
                        message: 'Failed, Invalid json fromat',
                        count: 0,
                        payload: [],
                      });
                    }

                  } else {
                    response.status(HttpStatus.OK).send({
                      message: 'Failed, key not found',
                      count: 0,
                      payload: [],
                    });
                  }

                }
              });

            if (dataSet.length > 0) {
              response.status(HttpStatus.OK).send({
                message: 'Success',
                count: count,
                payload: dataSet,
              });
            } else {
              response.status(HttpStatus.OK).send({
                message: 'Failed',
                count: 0,
                payload: [],
              });
            }
          },
        );
      } else {
        response.status(HttpStatus.NOT_FOUND).send({
          message: 'Log not found',
          count: 0,
          payload: [],
        });
      }
    } else {
      response.status(HttpStatus.NOT_FOUND).send({
        message: 'filters is not a valid json',
        count: 0,
        payload: [],
      });
    }
  }
}
