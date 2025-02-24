// import {
//   OnQueueActive,
//   OnQueueCompleted,
//   OnQueueFailed,
//   OnQueueProgress,
//   Process,
//   Processor,
// } from '@nestjs/bull';
// import { Inject } from '@nestjs/common';
// import { Job } from 'bull';

// import { SlconfigService } from './slconfig.service';

// @Processor('redis-config-queue')
// export class RedisConfigProcessor {
//   constructor(
//     @Inject(SlconfigService) private readonly slConfigService: SlconfigService,
//   ) {
//     //
//   }

//   @OnQueueActive()
//   onActive(job: Job) {
//     console.log(`Processing job ${job.id} of type ${job.name}...`);
//   }

//   @OnQueueProgress()
//   onProgress(job: Job) {
//     console.log(`Job ${job.id} of type ${job.name} is in progress now...`);
//   }

//   @OnQueueCompleted()
//   onCompleted(job: Job) {
//     console.log(`Job ${job.id} of type ${job.name} is completed now...`);
//   }

//   @OnQueueFailed()
//   onFailed(job: Job) {
//     //
//   }

//   @Process('reload-keyword')
//   async importLocationTimezone(job: Job) {
//     await this.slConfigService.loadKeyword(job.data.parameter);
//   }

//   @Process('reload-lov')
//   async reloadLovData(job: Job) {
//     await this.slConfigService.loadLov(job.data.parameter);
//   }

//   @Process('reload-notificationtemplate')
//   async reloadNotificationTemplateData(job: Job) {
//     await this.slConfigService.loadNotificationTemplate(job.data.parameter);
//   }
// }
