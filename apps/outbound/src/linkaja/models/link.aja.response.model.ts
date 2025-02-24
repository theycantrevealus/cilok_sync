import {ApiProperty} from "@nestjs/swagger"
import {HttpStatus} from "@nestjs/common";
import {ExampleResponse} from "@/example/dtos/response.dto";

export class LinkAjaResponseModel extends ExampleResponse {

  @ApiProperty({
    example: HttpStatus.OK,
    description: 'Created',
  })
  statusCode: number;

  @ApiProperty({
    example: [
      '00 :Success',
      '03: Invalid Request/Unauthorized/Invalid Signature',
      '05: Customer not found',
      '26: Transaction already processed',
      '25: Data not match',
      '15: Top up amount exceeds balance limit',
      '40: Transaction not found',
      '51: Insufficient balance',
      '78: Customer account blocked/closed',
      '89: Time out',
      '94: Duplicate Transaction',
      '99: General Error',
    ],
    description: "" +
      "<table> " +
      "<tr><td>Response Code </td><td>Response Message</td></tr> " +
      "<tr><td>00</td><td>Success</td></tr> " +
      "<tr><td>03</td><td>Invalid Request/Unauthorized/Invalid Signature</td></tr> " +
      "<tr><td>05</td><td>Customer not found</td></tr> " +
      "<tr><td>26</td><td>Transaction already processed</td></tr> " +
      "<tr><td>25</td><td>Data not match</td></tr> " +
      "<tr><td>15</td><td>Top up amount exceeds balance limit</td></tr> " +
      "<tr><td>40</td><td>Transaction not found</td></tr> " +
      "<tr><td>51</td><td>Insufficient balance</td></tr> " +
      "<tr><td>78</td><td>Customer account blocked/closed</td></tr> " +
      "<tr><td>89</td><td>Time out</td></tr> " +
      "<tr><td>94</td><td>Duplicate Transaction</td></tr> " +
      "<tr><td>99</td><td>General Error</td></tr> " +
      "</table>",

  })
  message: string;

}
