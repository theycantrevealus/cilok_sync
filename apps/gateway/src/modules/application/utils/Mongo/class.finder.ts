import { connection, Schema } from 'mongoose';

const ConvForUserSchema = new Schema(
  {
    user_id: Number,
    conv_hash: String,
    archived: Boolean,
    unread: Boolean,
  },
  {
    versionKey: false,
    strict: false,
  },
);

/*
 * Define the dynamic function
 */
const models = {};
const getModel = (collectionName) => {
  if (!(collectionName in models)) {
    models[collectionName] = connection.model(
      collectionName,
      ConvForUserSchema,
      collectionName,
    );
  }
  return models[collectionName];
};

export { getModel };
