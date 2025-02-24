import {ApiProperty} from "@nestjs/swagger";
import {Type} from "class-transformer";
import {EsbOrganizationDto} from "@/esb/dtos/esb.organization.dto";
import {BalanceTransactionDto} from "@/esb/dtos/balance.transaction.dto";
import {BalanceDto} from "@/esb/dtos/balance.dto";
import {EsbBaseResponseBadRequest} from "@/esb/dtos/ebs.base.response";
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto";
import {ArrayNotEmpty} from "class-validator";

export class EsbGetbalanceResponse {
  @ApiProperty({
    description: "Transaction object of esb get balance",
  })
  @Type(() => BalanceTransactionDto)
  transaction: BalanceTransactionDto;

  @ApiProperty({
    description: "Organization of esb get balance. This is optional",
    required: false,
  })
  @Type(() => EsbOrganizationDto)
  organization: EsbOrganizationDto;

  @ApiProperty({
    description: "Organization of esb get balance.",
  })
  @ArrayNotEmpty()
  @Type(() => BalanceDto)
  balance: BalanceDto[];
}

export class EsbGetBalanceDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description: "Response from get balance",
    type: EsbGetbalanceResponse
  })
  @Type(() => EsbGetbalanceResponse)
  payload: EsbGetbalanceResponse;
}


export class EsbGetBalanceResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description : "BAD REQUEST Transaction ESB"
  })
  code: string;

  constructor() {
    super();
    this.code = 'E02000';
  }
}

