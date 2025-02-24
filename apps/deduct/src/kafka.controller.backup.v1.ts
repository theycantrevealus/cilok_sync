// import { Controller, Inject } from '@nestjs/common';
// import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';

// import { KafkaService } from './kafka.service';

// @Controller()
// export class KafkaController {
//   constructor(
//     private readonly kafkaService: KafkaService,
//     @Inject('DEDUCT_SERVICES') private readonly clientDeduct: ClientKafka) {}

//   @MessagePattern('deduct')
//   async validation(@Payload() payload: any){
//     let keyword = payload.keyword; 
//     let eligibility = payload.keyword.eligibility; 

//     if(eligibility.poin_value === 'Fixed Multiple' && keyword.bonus.length > 0) {
//       this.kafkaService.notification_deduct("Fail because fixed multiple and bonus is exists ", payload);
//     }else {
//         if(eligibility.poin_value === 'Fixed') {
//           payload.payload.deduct.amount = eligibility.poin_redeemed;
//           this.deduct(payload);
//         }else if(eligibility.poin_value === 'Flexible') {
//           if (payload.payload.deduct.amount == 0) {
//             payload.payload.deduct.amount = eligibility.poin_redeemed;
//           }
//           this.deduct(payload);
//         }else if(eligibility.poin_value === 'Fixed Multiple') {
//           console.log('hitung', payload.rule.fixed_multiple.counter);
//           if (payload.rule.fixed_multiple.counter > payload.incoming.total_redeem) {
//             console.log('done', payload.rule.fixed_multiple.counter);
//           } else {
//             payload.payload.deduct.amount = eligibility.poin_redeemed;
//             console.log('kirim deduct : ', payload.rule.fixed_multiple.counter);
//             payload.rule.fixed_multiple.counter += 1; 
//             this.clientDeduct.emit('deduct', payload).subscribe(async (e) => {
//               await this.deduct(payload);
//             });
//           }          
//         }else {
//           this.kafkaService.notification_deduct("Fail, point value is unknown ", payload);
//         }
//     }
//   }

//   async deduct(payload:any){
//     return this.kafkaService
//     .point_deduct(
//         payload.incoming,
//         payload.account,
//         payload.payload.deduct,
//         payload.token,
//     )
//     .then((e) => {
//         console.log('berhasil', e.code)
//         if (e.code == 'S00000') {
//           // send to outbound or inbound
//           console.log(payload.bonus);
//           this.kafkaService.integration_deduct(payload, e);
//           return false
//         } else {
//           console.log('Error');
//           if (e.code == 'E02001') {
//             // send notification
//             this.kafkaService.notification_deduct(e.message, payload);
//             return false
//           } else {
//             // retry emit to consumer deduct until limit config
//             this.kafkaService.retry_deduct(e.message, payload);
//             return false
//           }
//         }
//     })
//     .catch((e) => {
//       console.log('gagal ', e)
//       // retry emit to consumer deduct until limit config
//       this.kafkaService.retry_deduct(e.message, payload);
//       return false;
//     });
//   }
// }
