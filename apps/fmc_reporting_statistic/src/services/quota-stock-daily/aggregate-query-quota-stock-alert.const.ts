const noData = 'Data tidak ditemukan';
export const REPORT_QUOTA_ALERT_QUERY_AGGREGATION = [
  {
    $match: {
      keyword: {
        $exists: true,
        $ne: null,
        $type: 'objectId',
      },
    },
  },
  {
    $lookup: {
      from: 'keywords',
      localField: 'keyword',
      foreignField: '_id',
      as: 'keyword',
    },
  },
  {
    $unwind: {
      path: '$keyword',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      program_id: {
        $cond: [
          { $gte: ['$keyword.eligibility.program_id', ''] },
          { $toObjectId: '$keyword.eligibility.program_id' },
          '',
        ],
      },
    },
  },
  {
    $lookup: {
      from: 'programv2',
      localField: 'program_id',
      foreignField: '_id',
      as: 'program',
    },
  },
  {
    $unwind: {
      path: '$program',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'locations',
      localField: 'location',
      foreignField: '_id',
      as: 'location',
    },
  },
  {
    $unwind: {
      path: '$location',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      program_name: '$program.name',
      keyword_name: {
        $cond: [
          { $gte: ['$keyword.eligibility.name', ''] },
          '$keyword.eligibility.name',
          null,
        ],
      },
      location_name: '$location.name',
      stock: {
        $arrayToObject: {
          $map: {
            input: '$keyword.bonus',
            as: 'bonus',
            in: {
              k: 'stock',
              v: { $sum: '$$bonus.stock_location.stock' },
            },
          },
        },
      },
      balance: '$balance',
    },
  },
];
export const REPORT_QUOTA_ALERT_PER_PROGRAM_QUERY_AGGREGATION = [
  {
    $match: {
      keyword: {
        $exists: true,
        $ne: null,
      },
    },
  },
  {
    $lookup: {
      from: 'keywords',
      localField: 'keyword',
      foreignField: '_id',
      as: 'keyword',
    },
  },
  {
    $unwind: {
      path: '$keyword',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      program_id: {
        $cond: [
          { $gte: ['$keyword.eligibility.program_id', ''] },
          { $toObjectId: '$keyword.eligibility.program_id' },
          '',
        ],
      },
    },
  },
  {
    $lookup: {
      from: 'programv2',
      localField: 'program_id',
      foreignField: '_id',
      as: 'program',
    },
  },
  {
    $unwind: {
      path: '$program',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'locations',
      localField: 'location',
      foreignField: '_id',
      as: 'location',
    },
  },
  {
    $project: {
      _id: 0,
      keyword_name: {
        $cond: [
          { $gte: ['$keyword.eligibility.name', ''] },
          '$keyword.eligibility.name',
          noData,
        ],
      },
      locations: '$keyword.eligibility.locations',
      program: '$program',
      keyword: '$keyword',
      stock: {
        $arrayToObject: {
          $map: {
            input: '$keyword.bonus',
            as: 'bonus',
            in: {
              k: 'stock',
              v: { $sum: '$$bonus.stock_location.stock' },
            },
          },
        },
      },
      balance: '$balance',
    },
  },
];
