import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type KafkaMbseConsumerLogsDocument = KafkaMbseConsumerLogs & Document;

@Schema({
  timestamps: {
    createdAt: true,
  },
})
export class KafkaMbseConsumerLogs {
  @Prop({ type: SchemaTypes.String })
  data: any;

  @Prop({ type: String })
  offset: string;
}

export const KafkaMbseConsumerLogsSchema = SchemaFactory.createForClass(
  KafkaMbseConsumerLogs,
);
