import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { EsbBaseResponseBadRequest } from './ebs.base.response';
import { EsbTransactionResponse } from './esb.transaction.response';

export class EsbOrderResponse {
  @ApiProperty({
    description: 'Transaction',
  })
  @Type(() => EsbTransactionResponse)
  transaction: EsbTransactionResponse;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>Eligibility status. Acquired from Rule Validation.</td><td>Mandatory for order_type ACT.</td></tr> </table>',
    required: false,
  })
  iseligible: string;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>E43-digit Order ID from RV.</td><td>Mandatory when version is v2 or higher.</td></tr> </table>',
    required: false,
  })
  order_id: string;

  @ApiProperty({
    description: 'Service ID for donator.',
    minLength: 11,
    maxLength: 13,
    required: true,
  })
  service_id_a: string;

  @ApiProperty({
    description: 'Notification.',
    required: true,
  })
  notification: string;

  @ApiProperty({
    description:
      "<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>Redirect URL.</td><td>Mandatory when <br><ul><li>payment_method is 'SHOPEEPAY' and funder_service_id is not 'binding' and bank_name is not “binding”</li> <br><li>payment_method is “DANA” and funder_service_id is not “binding” and bank_name is not “binding”</li></ul><br><br></td></tr> </table> <br>",
    required: false,
  })
  redirect_url: string;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>URL redirection deeplink.</td><td>Mandatory when <br><ul><li>payment_method is “SHOPEEPAY” and funder_service_id is not “binding” and bank_name is not “binding”</li> <br><li>payment_method is “FINNET_CC”, “FINNET_VA”, “FINNET_WALLET”</li></ul><br><br></td></tr> </table> <br>',
    required: false,
  })
  deeplink_url: string;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>QR URL.</td><td>Mandatory when <br>payment_method: - QRIS</td></tr> </table> <br>',
    required: false,
  })
  qr_url: string;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>URL Redirection for checkout.</td><td>Mandatory when <br><ul><li>payment_method is “DANA” and funder_service_id is not “binding” and bank_name is not “binding”</li> <br><li>ppayment_method is “SHOPEEPAY” and funder_service_id is not “binding”</li></ul> <br><br></td></tr> </table>',
    required: false,
  })
  checkout_url: string;

  @ApiProperty({
    description:
      '<table> <tr><td>Description </td><td>Mandatory Condition</td></tr> <tr><td>Payment code.</td><td>Mandatory when <br><ul><li>INDOMARET</li> <li>OMNICHANNEL</li> <li>FINNET_VA</li> <li>FINNET_WALLET</li> <li>MCP_VA</li> </ul></td></tr> </table> <br>',
    required: false,
  })
  payment_code: string;
  network_profile: object;
}

export class EsbOrderResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description: 'BAD REQUEST Submit Order ESB',
  })
  code: string;

  constructor() {
    super();
    this.code = 'E02000';
  }
}
