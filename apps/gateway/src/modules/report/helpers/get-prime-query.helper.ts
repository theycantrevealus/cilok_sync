import { Model, Types } from 'mongoose';

import { getOidFields } from './get-oid-fields.helper';

// Param example: {"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{"_id":{"matchMode": "equals", "value": "6392db3414561c08156bef65" }}}
export async function getPrimeQuery<T>(
  param: any,
  model: Model<T>,
): Promise<{
  query: any[];
  totalRecords: number;
}> {
  const first = param.first ? parseInt(param.first) : 0;
  const rows = param.rows ? parseInt(param.rows) : 20;
  const sortField = param.sortField ? param.sortField : 'created_at';
  const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
  const filters = param.filters;
  const query = [];
  const sort_set = {};

  const filter_builder = { $and: [] };

  for (const key in filters) {
    if (
      key &&
      key !== '' &&
      filters[key].value !== '' &&
      filters[key].value !== null
    ) {
      const value = getOidFields(model)
        ? new Types.ObjectId(filters[key].value)
        : filters[key].value;

      const filter_item = {};
      if (filter_item[key] === undefined) {
        filter_item[key] = {};
      }

      if (filters[key].matchMode === 'contains') {
        filter_item[key] = {
          $regex: new RegExp(`${filters[key].value}`, 'i'),
        };
      } else if (filters[key].matchMode === 'notContains') {
        filter_item[key] = {
          $not: {
            $regex: new RegExp(`${filters[key].value}`, 'i'),
          },
        };
      } else if (filters[key].matchMode === 'endsWith') {
        filter_item[key] = {
          $regex: new RegExp(`${filters[key].value}$`, 'i'),
        };
      } else if (filters[key].matchMode === 'equals') {
        filter_item[key] = {
          $eq: value,
        };
      } else if (filters[key].matchMode === 'notEquals') {
        filter_item[key] = {
          $not: {
            $eq: value,
          },
        };
      }

      filter_builder.$and.push(filter_item);
    }
  }

  if (filter_builder.$and.length > 0) {
    query.push({
      $match: filter_builder,
    });
  } else {
    query.push({
      $match: {
        $and: [{ deleted_at: null }],
      },
    });
  }

  const allNoFilter = await model.aggregate(query, (err, result) => {
    return result;
  });

  query.push({ $skip: first });

  query.push({ $limit: rows });

  if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
    if (sort_set[sortField] === undefined) {
      sort_set[sortField] = sortOrder;
    }

    query.push({
      $sort: sort_set,
    });
  }

  return { query, totalRecords: allNoFilter.length };
}
