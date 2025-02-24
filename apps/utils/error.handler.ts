import { BadRequestException } from '@nestjs/common';

export function handleException(error: any) {
  throw new BadRequestException(error);
}
