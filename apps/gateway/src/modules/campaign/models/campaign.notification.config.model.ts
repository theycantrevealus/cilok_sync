import {Prop} from "@nestjs/mongoose";
import mongoose, {SchemaTypes} from "mongoose";
import {NotificationTemplate} from "@/notification/models/notification.model";
import {Type} from "class-transformer";
import {Lov} from "@/lov/models/lov.model";

export class CampaignNotificationConfig {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: NotificationTemplate.name,
  })
  @Type(() => NotificationTemplate)
  source_id: NotificationTemplate;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Lov.name,
  })
  @Type(() => Lov)
  type: Lov;

  @Prop({ type: SchemaTypes.Array })
  via: Array<any>;

  @Prop({ type: SchemaTypes.String })
  content: string;

  constructor(
    source_id?: NotificationTemplate,
    type?: Lov,
    via?: Array<any>,
    content?: string,
  ) {
    this.source_id = source_id;
    this.type = type;
    this.via = via;
    this.content = content;
  }
}
