import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  Type,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      console.error('Debug error on validation pipe');
      throw new BadRequestException('Validation failed');
    }
    return value;
  }

  private toValidate(metatype: Type): boolean {
    const types: Type[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, Types.ObjectId> {
  transform(value: any): Types.ObjectId {
    const validObjectId = Types.ObjectId.isValid(value);

    if (!validObjectId) {
      console.error('Debug error on validation pipe invalid object');
      throw new BadRequestException('Invalid ObjectId');
    }

    return new Types.ObjectId(value);
  }
}

export function toMongoObjectId({ value, key }): Array<Types.ObjectId> {
  const data: Array<Types.ObjectId> = [];
  value.map((e) => {
    if (Types.ObjectId.isValid(e) && new Types.ObjectId(e).toString() === e) {
      data.push(new Types.ObjectId(e));
    } else {
      console.error('Debug error on validation pipe on mongoid');
      throw new BadRequestException(`${key} is not a valid MongoId`);
    }
  });
  return data;
}
