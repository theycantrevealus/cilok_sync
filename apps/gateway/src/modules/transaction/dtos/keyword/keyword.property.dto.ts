const ApiOperationKeyword = {
  status: {
    summary: 'Keyword Status',
    description: 'This API used to get information keyword status',
  },
  stock: {
    summary: 'Keyword Stock',
    description: 'This API used to get information keyword stock with redis',
  },
};

const ApiQueryKeyword = {
  locale: {
    name: 'locale',
    type: String,
    required: false,
    description: `“en-US”`,
  },
  keyword: {
    name: 'keyword',
    type: String,
    required: true,
    description: `Keyword`,
  },
  transaction_id: {
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  },
  channel_id: {
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  },
  filter: {
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
    { "code": "X", "name": "Y" }
    `,
  },
  additional_param: {
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
    { "code": "X", "name": "Y" }
    `,
  },
};

const ApiQueryEligibilityKeyword = {
  keyword: {
    name: 'keyword',
    type: String,
    required: false,
    description: `Program`,
  },
  program: {
    name: 'program',
    type: String,
    required: false,
    description: `Program`,
  },
}

export { ApiOperationKeyword, ApiQueryKeyword,ApiQueryEligibilityKeyword };
