import {ApiProperty} from "@nestjs/swagger"
import {HttpStatus} from "@nestjs/common";
import {ExampleResponse} from "@/example/dtos/response.dto";

export class AdjustCustomerPointResponseModel extends ExampleResponse {

  @ApiProperty({
    example: HttpStatus.OK,
    description: 'Created',
  })
  statusCode: number;

  @ApiProperty({
    example: [
      '00 :Success',
      '01: Invalid Parameter',
      '02: Internal Error',
      '03: Backend Error',
      '04: Db Error',
      '05: Query Error',
      '06: Credential Not Valid',
      '07: Decrypt Failed',
      '08: Bucket Not Found',
      '09: Bucket Empty',
      '10: Bucket Expired',
      '15: Fraud check is failed',
      '16: Blacklisted user',
    ],
    description: "" +
      "<table> " +
      "<tr><td>Response Code </td><td>Response Message</td></tr> " +
      "<tr><td>00</td><td>Success</td></tr> " +
      "<tr><td>01</td><td>Invalid Parameter</td></tr> " +
      "<tr><td>02</td><td>Internal Error</td></tr> " +
      "<tr><td>03</td><td>Backend Error</td></tr> " +
      "<tr><td>04</td><td>DB Error</td></tr> " +
      "<tr><td>05</td><td>Query Error</td></tr> " +
      "<tr><td>06</td><td>Credential Not Valid</td></tr> " +
      "<tr><td>07</td><td>Decrypt Failed</td></tr> " +
      "<tr><td>08</td><td>Bucket Not Found</td></tr> " +
      "<tr><td>09</td><td>Bucket Empty</td></tr> " +
      "<tr><td>10</td><td>Bucket Expired</td></tr> " +
      "<tr><td>15</td><td>Fraud check is failed</td></tr> " +
      "<tr><td>16</td><td>Blacklisted user</td></tr> " +
      "</table>",

  })
  message: string;

}
