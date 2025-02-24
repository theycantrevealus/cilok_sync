import { HttpStatus, Injectable } from '@nestjs/common';
import { NotificationContentDto } from '../dto/notification-content.dto';
import { NotificationNonTransactionDto } from '../dto/notification-non-transaction.dto';
import { NotificationFirebaseAddDto } from '../dto/notification.firebase.add.dto';

@Injectable()
export class NotificationGeneralMessageBuild  {
  constructor(
  ) {
    //
  }

  //Build Message
  async buildMessageFromProgram(data: NotificationFirebaseAddDto): Promise<NotificationNonTransactionDto>{
    try {
      let message = new NotificationNonTransactionDto()
      message.tracing_id = data.tracing_id
      message.tracing_master_id = data.tracing_master_id
  
      let notifContent = new NotificationContentDto();
      notifContent.via = "Email";
      notifContent.template_content = data.content;
      notifContent.param = {
        "to": data.receiver_email,
        "cc": '',
        "text" : data.content,
        "subject" : data.title
      }
  
      // Initialize message.notification as an empty array if it's undefined
      if (!message.notification) {
        message.notification = [];
      }
  
      message.notification.push(notifContent);
      
      return message;
    } catch (e) {
      throw new Error(e.message);
    }
  }
  
  
}
