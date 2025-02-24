export const REPORT_QUOTA_STOCK_DAILY_QUERY_AGGREGATION = [
  {
    '$match': {
      'keyword': {
        '$exists': true, 
        '$ne': null
      }
    }
  }, {
    '$lookup': {
      'from': 'keywords', 
      'localField': 'keyword', 
      'foreignField': '_id', 
      'as': 'keyword'
    }
  }, {
    '$unwind': {
      'path': '$keyword', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$lookup': {
      'from': 'locations', 
      'localField': 'location', 
      'foreignField': '_id', 
      'as': 'location'
    }
  }, {
    '$unwind': {
      'path': '$location', 
      'preserveNullAndEmptyArrays': true
    }
  }, {
    '$project': {
      'program_name': '$keyword.eligibility.program_title_expose', 
      'keyword_name': '$keyword.eligibility.name', 
      'location_name': '$location.name', 
      'balance': '$balance'
    }
  }
]
