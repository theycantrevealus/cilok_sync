import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Job } from 'bull';

import { SlRedisService } from './slredis.service';

@Processor('redis-config-queue')
export class RedisConfigProcessor {
  constructor(
    @Inject(SlRedisService) private readonly slRedisService: SlRedisService,
  ) {
    //
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is in progress now...`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is completed now...`);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    //
  }

  @Process('reload-keyword')
  async importLocationTimezone(job: Job) {
    // await this.slRedisService.loadKeyword(job.data.parameter);
  }

  @Process('reload-lov')
  async reloadLovData(job: Job) {
    await this.slRedisService.loadLov(job.data.parameter);
  }

  @Process('reload-notificationtemplate')
  async reloadNotificationTemplateData(job: Job) {
    await this.slRedisService.loadNotificationTemplate(job.data.parameter);
  }
}
