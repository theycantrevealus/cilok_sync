const ApiQueryTransaction = {
  identifier: {
    required: true,
    name: 'identifier',
    type: String,
    default: 'MSISDN',
    description: `Identifier :
      <p>a. MSISDN :  Phone number</p>
      <p>b. INDIHOME_NUMBER :  Indihome number</p>
      <p>c. TSEL_ID : Telkomsel ID</p>`,
  },
};

const FMCErrorMsgResp = {
  required: {
    identifier: 'identifier is required',
  },
};

export { ApiQueryTransaction, FMCErrorMsgResp };
