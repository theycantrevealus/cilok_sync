const ApiOperationWhitelist = {
  inject: {
    summary: 'Inject Whitelist',
    description:
      'This API used to inject point to subscriber based on defined keyword. ',
  },
  counter: {
    summary: 'Whitelist Counter',
    description:
      'This API used to counter whitelist for a subscriber for specific program',
  },
};

const ApiQueryWhitelist = {
  locale: {
    name: 'locale',
    type: String,
    required: false,
    description: `“en-US”`,
  },
  msisdn: {
    name: 'msisdn',
    type: String,
    required: true,
    description: `Subscriber number`,
  },
  program_id: {
    name: 'program_id',
    type: String,
    required: false,
    description: `Program Id ( Need one of parameter Program Id or Keyword )`,
  },
  keyword: {
    name: 'keyword',
    type: String,
    required: false,
    description: `Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )`,
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

export { ApiOperationWhitelist, ApiQueryWhitelist };
