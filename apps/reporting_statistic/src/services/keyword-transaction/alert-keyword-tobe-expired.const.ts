const period = new Date();
console.log(period);
const noData = 'Data tidak ditemukan';
export const ALERT_KEYWORD_TOBE_EXPIRED_AGGREGATION = [
  {
    $match: {
      keyword_approval: {
        $exists: true,
        $ne: null,
      },
      'eligibility.end_period': {
        $lt: period,
      },
    },
  },
  {
    $addFields: {
      end_period: '$eligibility.end_period',
      program_id: {
        $cond: [
          { $gte: ['$eligibility.program_id', ''] },
          { $toObjectId: '$eligibility.program_id' },
          '',
        ],
      },
      location_type: {
        $cond: [
          { $gte: ['$eligibility.location_type', ''] },
          { $toObjectId: '$eligibility.location_type' },
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
      localField: 'location_type',
      foreignField: 'type',
      as: 'location',
    },
  },
  {
    $project: {
      _id: 0,
      program_name: {
        $cond: [{ $gte: ['$program.name', ''] }, '$program.name', noData],
      },
      keyword_name: {
        $cond: [
          { $gte: ['$eligibility.name', ''] },
          '$eligibility.name',
          noData,
        ],
      },
      location_name: {
        $cond: [{ $gte: ['$location.name', ''] }, '$location.name', noData],
      },
      expired: {
        $cond: [
          { $gte: ['$eligibility.end_period', ''] },
          '$eligibility.end_period',
          noData,
        ],
      },
      notes: 'REDEEM',
    },
  },
];
