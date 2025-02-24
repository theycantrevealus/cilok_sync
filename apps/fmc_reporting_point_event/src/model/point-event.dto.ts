export class PointEventDTO {
  trx_date?: string;
  msisdn?: string;
  trx_datetime?: string;
  poin?: string;
  pointype?: string;
  reedem_channel?: string;
  merchant_name?: string;
  customer_tier?: string;
  poin_balance?: string;
  trx_id?: string;

  startBodySoap(): string {
    return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:PoinEvent"><soapenv:Header/><soapenv:Body><urn:PoinEventRequest>`;
  }

  endBodySoap(): string {
    return `</urn:PoinEventRequest></soapenv:Body></soapenv:Envelope>`;
  }

  buildItemSoapBody(data: { name: string; value: string }): string {
    if (data) {
      if (data.value) {
        return `<urn:${data.name}>${data.value}</urn:${data.name}>`;
      }
      return '';
    } else {
      return '';
    }
  }

  buildSoapBody(): string {
    let soapBody = this.buildItemSoapBody(null);
    const startBody = this.startBodySoap();
    const endBody = this.endBodySoap();

    // TODO: can implement chain of responsibility pattern
    soapBody =
      soapBody +
      this.buildItemSoapBody({ name: 'trx_date', value: this.trx_date });
    soapBody =
      soapBody + this.buildItemSoapBody({ name: 'msisdn', value: this.msisdn });
    soapBody =
      soapBody +
      this.buildItemSoapBody({
        name: 'trx_datetime',
        value: this.trx_datetime,
      });
    soapBody =
      soapBody + this.buildItemSoapBody({ name: 'poin', value: this.poin });
    soapBody =
      soapBody +
      this.buildItemSoapBody({ name: 'pointype', value: this.pointype });
    soapBody =
      soapBody +
      this.buildItemSoapBody({
        name: 'reedem_channel',
        value: this.reedem_channel,
      });
    soapBody =
      soapBody +
      this.buildItemSoapBody({
        name: 'merchant_name',
        value: this.merchant_name,
      });
    soapBody =
      soapBody +
      this.buildItemSoapBody({
        name: 'customer_tier',
        value: this.customer_tier,
      });
    soapBody =
      soapBody +
      this.buildItemSoapBody({
        name: 'poin_balance',
        value: this.poin_balance,
      });
    soapBody =
      soapBody + this.buildItemSoapBody({ name: 'trx_id', value: this.trx_id });

    return startBody + soapBody + endBody;
  }
}

// #reference body soap
// const data = `
// <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:PoinEvent">
//     <soapenv:Header/>
//     <soapenv:Body>
//         <urn:PoinEventRequest>
//             <urn:trx_date>${payload.trx_date}</urn:trx_date>
//             <urn:msisdn>${payload.msisdn}</urn:msisdn>
//             <urn:trx_datetime>${payload.trx_datetime}</urn:trx_datetime>
//             <urn:poin>${payload.poin}</urn:poin>
//             <urn:pointype>${payload.pointype}</urn:pointype>
//             <urn:reedem_channel>${payload.reedem_channel}</urn:reedem_channel>
//             <urn:merchant_name>${payload.merchant_name}</urn:merchant_name>
//             <urn:customer_tier>${payload.customer_tier}</urn:customer_tier>
//             <urn:poin_balance>${payload.poin_balance}</urn:poin_balance>
//             <urn:trx_id>${payload.trx_id}</urn:trx_id>
//         </urn:PoinEventRequest>
//     </soapenv:Body>
// </soapenv:Envelope>`;
