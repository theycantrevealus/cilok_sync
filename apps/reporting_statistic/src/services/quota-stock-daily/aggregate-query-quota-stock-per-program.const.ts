export const REPORT_QUOTA_ALERT_QUERY_AGGREGATION = [
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
      program_id: { $toObjectId: '$keyword.eligibility.program_id' },
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
      program_name: '$keyword.eligibility.program_title_expose',
      keyword_name: '$keyword.eligibility.name',
      location_name: '$location.name' ?? 'Unknown',
      threshold_alarm_voucher: '$program.threshold_alarm_voucher',
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
      used: '$balance',
    },
  },
];
