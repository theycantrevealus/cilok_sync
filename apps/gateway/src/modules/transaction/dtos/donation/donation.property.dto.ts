const ApiOperationDonation = {
  my_donation: {
    summary: 'My Donation',
    description: 'This API used to get list of donation by subscriber',
  },
  check_donation_by_keyword: {
    summary: 'Check Donation By Keyword',
    description: 'This API used to get list of donation by keyword',
  },
};

const ApiParamMyDonation = {
  msisdn: {
    name: 'msisdn',
    type: String,
    required: true,
    description: `Subscriber number`,
  },
};

const ApiQueryMyDonation = {
  limit: {
    name: 'limit',
    type: String,
    required: false,
    description: `Limit record, default is last 5 records ( configurable )`,
  },
  skip: {
    name: 'skip',
    type: String,
    required: false,
    description: `Offset data, will start record after specified value.`,
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

const ApiQueryDonationKeyword = {
  keyword: {
    name: 'keyword',
    type: String,
    required: true,
    description: `Donation keyword`,
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

export {
  ApiOperationDonation,
  ApiParamMyDonation,
  ApiQueryDonationKeyword,
  ApiQueryMyDonation,
};
