const ApiQueryInventory = {
  locale: {
    name: 'locale',
    type: String,
    example: 'th-TH',
    description: 'Locale Code for the response (ex. en-US, th-TH)',
    required: false,
  },
  multi_locale_flag: {
    name: 'multi_locale_flag',
    type: String,
    example: 'true',
    description: '<div><p>Flag indicating whether content should be returned in multi-locale support (with i18n properties); </p><ul> <li><b>true</b> &nbsp;: Response content will be returned with i18n properties for all locales</li> <li><b>false</b> : Response content will be returned with the identified locale only (no i18n properties)</li> </ul><p></p></div>',
    required: false,
  },
  search_term: {
    name: 'search_term',
    type: String,
    example: '',
    description: 'Search Parameter',
    required: false,
  },
  limit: {
    name: 'limit',
    type: Number,
    example: '',
    description: 'Return data record(s) equal to limit value',
    required: false,
  },
  skip: {
    name: 'skip',
    type: Number,
    example: '',
    description: 'Return the rest data after offset',
    required: false,
  },
  filter: {
    name: 'filter',
    type: String,
    example: '',
    description: '<div><p>Return only data matching to filter (ex. <code>{ "code": "X" }</code>)<br><em>Value to compare is whole word and case sensitive</em></p></div>',
    required: false,
  },
  sort: {
    name: 'sort',
    type: String,
    example: '{ "id" : 1 }',
    description: '<div><p>Return sort data with specific field name (ex. <code>{ "code": -1 }</code>); </p><ul> <li>&nbsp;&nbsp;<b>1</b> : Ascending</li> <li><b>-1</b> : Descending</li> </ul><p></p></div>',
    required: false,
  },
  projection: {
    name: 'projection',
    type: String,
    example: '{ "id": 1, "status": 1, "desc" : 1, "name": 1, "__v": 1, "time": 1 }',
    description:
      'Return data with specific field name in projection or for get any fileds to show on list. (ex. <code>{ "code": 1 }</code>)',
    required: false,
  },
  addon: {
    name: 'addon',
    type: String,
    example: '{ "agent": 1 }',
    description: 'Return data with specific field name in projection and addon (ex. <code>{ "agent": 1 }</code>)',
    required: false,
  },
  merchant_id : {
    name: 'merchant_id',
    type: String,
    example: 'mercht-623bdcce7399b50e38fbe93a',
    description: 'Primary key unique value for merchant_id <code>(ex. xxxxxx-5902ca0b0257bb14df426921)</code>',
    required: true,
  }
};

const ApiParamInventory = {
  id : {
    name: 'id',
    type: String,
    example: 'prdcat-5fd86580ae5f5148f31436ad',
    description: 'Primary key unique value <code>(ex. xxxxxx-5902ca0b0257bb14df426921)</code>',
    required: true,
  }
}


export { ApiQueryInventory, ApiParamInventory };
