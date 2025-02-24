import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import applicationConfig from '@prov_prepaid_configs/application.config';

import { ApplicationController } from './controllers/application.controller';
import { ApplicationService } from './services/application.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: 'client',
      serveRoot: '/backendrangers',
      renderPath: 'client',
      exclude: ['/api*'],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [applicationConfig],
    }),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {
  //
}
