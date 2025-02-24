const ApiOperationVoucher = {
  verification: {
    summary: 'Voucher Verification',
    description:
      'This API used to verify voucher from merchant before redeemed.',
  },
  view_voucher_list: {
    summary: 'View Voucher List',
    description:
      'This API used to counter whitelist for a subscriber for specific program',
  },
  get_msisdn_redeemer_voucher_code:{
    summary: 'Get MSISDN Redeemer by voucher code',
    description: 'This API used to get msisdn redeemer by voucher code.',
  },
};

const ApiQueryVoucher = {
  msisdn: {
    name: 'msisdn',
    type: String,
    required: true,
    description: `Subscriber number`,
  },
  voucher_status: {
    name: 'voucher_status',
    type: String,
    required: false,
    description: `Voucher Status : Redeem ( R) or Verified ( V )</br>
      If variable not send, will return both redeem and verified voucher
      `,
  },
  limit: {
    name: 'limit',
    type: Number,
    required: false,
    description: `Limit record, default is last 5 records ( configurable )`,
  },
  skip: {
    name: 'skip',
    type: Number,
    required: false,
    description: `Offset data, will start record after specified value.`,
  },
  from: {
    name: 'from',
    type: String,
    required: false,
    description: `Start date with format YYYY- MM-DD`,
  },
  to: {
    name: 'to',
    type: String,
    required: false,
    description: `Start date with format YYYY- MM-DD`,
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
    description: `Return only data matching to filter</br>
    { "code": "X", "name": "Y" }
    `,
  },
  additional_param: {
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional parameter if needed, with format :</br>{ "code": "X", "name": "Y" }`,
  },
};

const ApiParamRedeemVoucherCode = {
  voucher_code: {
    name: 'voucher_code',
    type: String,
    required: true,
    description: ``,
  },
};

export { ApiOperationVoucher, ApiQueryVoucher,ApiParamRedeemVoucherCode };
