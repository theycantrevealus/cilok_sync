import { Model } from 'mongoose';

export function getOidFields<T>(model: Model<T>): string[] {
  const oid_fields = ['_id'];

  Object.keys(model.schema.obj).forEach((field) => {
    const item: any = model.schema.obj[field];
    if (item?.type?.schemaName === 'ObjectId') {
      oid_fields.push(field);
    }
  });

  return oid_fields;
}
