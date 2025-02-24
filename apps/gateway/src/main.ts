import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OAuthFlowObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { WinstonCustomTransport } from '@utils/logger/transport';
import { ValidationError } from 'class-validator';
import * as compression from 'compression';
import * as path from 'path';
import * as process from 'process';
import * as winston from 'winston';

import { ApplicationModule } from '@/application/application.module';
import { SLCluster } from '@/application/cluster/cluster';
import { RequestValidatorFilter } from '@/filters/validator.filter';

declare const module: any;
const fastyfyMultipart = require('@fastify/multipart');

async function bootstrap() {
  // const { BullAdapter } = require('@bull-board/api/bullAdapter');
  // const Queue = require('bull');
  // await CommandFactory.run(ApplicationModule, [
  //   'warn',
  //   'error',
  //   'debug',
  //   'log',
  // ]);
  // const app = await NestFactory.create<NestExpressApplication>(
  //   ApplicationModule,
  // );
  // const now = new Date();
  const fastifyAdapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 102457600, // 100 MB
    // logger: {
    //   customLevels: {
    //     log: 1,
    //   },
    //   file: 'logs/gateway.log',
    // },
    ignoreDuplicateSlashes: true,
    ignoreTrailingSlash: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    ApplicationModule,
    fastifyAdapter,
    {
      bodyParser: false,
    },
  );

  const targetEnv: string =
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === '' ||
    process.env.NODE_ENV === 'development'
      ? 'development'
      : process.env.NODE_ENV;

  const logger = winston.createLogger({
    levels: {
      error: 0,
      warn: 1,
      verbose: 3,
    },
    handleRejections: true,
    handleExceptions: true,
    transports: WinstonCustomTransport[targetEnv].gateway,
  });

  // app.useGlobalFilters(new HttpExceptionFilter(logger));
  // app.useGlobalFilters(new CommonException(logger));
  // app.useGlobalFilters(new RequestValidatorFilterCustom(logger));

  // fastifyAdapter.register(require('@fastify/static'), {
  //   root: path.join(__dirname, 'log_viewer/dist'),
  //   prefix: `/staticzz`,
  //   index: false,
  //   list: true,
  // });

  await app.register(fastyfyMultipart, {
    addToBody: true,
  });

  app.use(compression());

  // const serverAdapter = new ExpressAdapter();
  // serverAdapter.setBasePath('/admin/queues');

  // const merchantQueue = new Queue('merchant', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const programQueue = new Queue('program', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const customerQueue = new Queue('customer', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const keywordQueue = new Queue('keyword', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const injectQueue = new Queue('inject', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const loggingQueue = new Queue('logging', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const locationQueue = new Queue('location-queue', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });
  //
  // const migrationQueue = new Queue('migration', {
  //   redis: { port: 6379, host: '127.0.0.1' },
  // });

  // const {} = createBullBoard({
  //   queues: [
  //     new BullAdapter(merchantQueue),
  //     new BullAdapter(programQueue),
  //     new BullAdapter(customerQueue),
  //     new BullAdapter(keywordQueue),
  //     new BullAdapter(injectQueue),
  //     new BullAdapter(loggingQueue),
  //     new BullAdapter(locationQueue),
  //     new BullAdapter(migrationQueue),
  //   ],
  //   serverAdapter: serverAdapter,
  // });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const configService = app.get<ConfigService>(ConfigService);

  // Sentry.init({
  //   dsn: configService.get<string>('sentry.dsn'),
  //   integrations: [
  //     new BrowserTracing({
  //       tracingOrigins: ['localhost', /^\//],
  //     }),
  //   ],
  //   tracesSampleRate: 1.0,
  // });
  //
  // app.use(Sentry.Handlers.requestHandler());
  // app.use(Sentry.Handlers.errorHandler());
  const options = new DocumentBuilder()
    .setTitle('Smile Loyalty Revamp')
    .setVersion('1')
    .addOAuth2({
      name: 'OAUTH',
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: `${configService.get<string>(
            'core-backend.api.token-gateway',
          )}`,
          scopes: {},
        } as OAuthFlowObject,
        password: {
          tokenUrl: `${configService.get<string>(
            'core-backend.api.token-gateway',
          )}`,
          scopes: {},
        } as OAuthFlowObject,
      },
    });

  options.addServer(`${configService.get<string>('application.hostport')}`);
  options.addServer(
    `${configService.get<string>('core-backend.raw')}${
      parseInt(configService.get<string>('core-backend.raw_port')) > 0
        ? `:${configService.get<string>('core-backend.raw_port')}`
        : ''
    }`,
  );

  const document = SwaggerModule.createDocument(app, options.build());

  const CaseInsensitiveFilterPlugin = function () {
    return {
      fn: {
        opsFilter: (taggedOps, phrase) => {
          const matchesSearch = taggedOps.filter(
            (tagObj, tag) =>
              tag.toLowerCase().indexOf(phrase.toLowerCase()) !== -1,
          );

          return matchesSearch;
        },
      },
    };
  };

  // color: #dc0012;
  // background: #001a41 !important;

  SwaggerModule.setup('swagger', app, document, {
    customCss: `
    @import url(https://fonts.googleapis.com/css?family=Handlee);
    body { padding-top: 218px !important; background: url(\'./body.jpg\') no-repeat; background-attachment: fixed; background-size: cover; }
    .topbar { box-shadow: 0 -30px 30px 30px #f6f3f3 inset; width: 100%; margin: 0 auto; position:fixed; top: 0; left: 0; z-index: 100; background: url(\'./mbi.png\')no-repeat !important; background-size: 130px 25px !important; background-color: #fff !important; background-position: 1430px 30px !important; }
    .topbar-wrapper img {content:url(\'./index.png\'); width:137px; height:auto; margin: 24px}
    .swagger-ui .topbar { background-color: #fff; z-index: 100; }
    .scheme-container { position: fixed; top: 100px; width: 100%; padding: 15px 0 !important; z-index: 200; box-shadow: 0 2px 4px 0 rgba(0,0,0,.15) !important; }
    .information-container { position: fixed; right: 250px; top: 0; padding: 0 !important; z-index: 100; }
    .information-container.wrapper { max-width: 800px; }
    .information-container .info { margin: 20px 0; }
    .backdrop-ux { z-index: 100 !important; }
    .information-container .info .title { text-align: right; font-size: 15pt !important; padding: 30px 0 0 20px !important; }
    .swagger-ui .opblock-tag { color: #001a41 !important; }
    .filter-container { margin-top: 100px; position: absolute; width: 100%; top: 0; z-index: 190; }
    .swagger-ui .filter .operation-filter-input { margin: 0 !important; position: fixed; width: 800px; z-index: 200; }
    .filter-container .filter { margin-top: -67.5px; padding: 0 !important; width: 1000px !important; }
    .opblock-summary { position: relative; }
    .opblock-summary-control { position: relative; }
    .opblock-summary-control svg { position: absolute; right: 10px; }
    .swagger-ui .opblock .opblock-summary-description { position: absolute; left: 50%; }
    .swagger-ui .opblock .opblock-summary-description::before { content: '📝'; position: absolute; left: -20px; }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { padding: 10px !important; background: #001a41 !important; color: #fff !important; }
    .swagger-ui table tbody tr td { padding: 10px !important; }
    .swagger-ui table tbody tr td { font-size: 10pt !important; vertical-align: top; }
    .swagger-ui table tbody tr td p { padding: 0 !important; margin: 0 !important; }
    .swagger-ui table tbody tr:nth-child(odd) td { background: #f2f2f2; }
    .swagger-ui table tbody tr:nth-child(even) td { background: #fff; }
    .model-example .tab .tabitem button { padding: 10px !important; color: #00a2ff !important; margin: 0 10px !important; position:relative !important; }
    .tabitem button::before { position: absolute; left: -10px; content: '📎' }
    .swagger-ui table.model tr.property-row .star { margin: 10px !important; }
    .swagger-ui .markdown p, .swagger-ui .markdown pre, .swagger-ui .renderedMarkdown p, .swagger-ui .renderedMarkdown pre { padding: 10px !important; font-size: 10pt !important; }
    .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p, .swagger-ui .opblock-title_normal p { font-size: 10pt !important; font-family: monospace !important; font-weight: 600 !important; }
    .operation-tag-content { padding-bottom: 100px !important; }
    .textmode li { list-style-type: none !important; }
    .property-row td:nth-child(2) { overflow: hidden !important; }
    .property-row td:nth-child(2)::before { }
    .property-row .model .renderedMarkdown {
      font-family: 'Handlee', cursive !important;
      margin: 10px !important;
      color: mediumblue !important;
      position: relative;
      min-height: 120px !important;
      background: #fafafa !important;
      padding: 0 35px 0 70px !important;
      border-radius: 10px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,.3) !important;
      background: linear-gradient(transparent, transparent 28px, #91D1D3 28px) !important;
      background-size: 30px 30px !important;
      line-height: 30px !important;
    }

    .property-row .model .renderedMarkdown:before {
      content: '';
      position: absolute !important;
      top: 0 !important; bottom: 0 !important; left: 5px !important;
      width: 50px !important;
      background: radial-gradient(#575450 6px, transparent 7px) repeat-y !important;
      background-size: 30px 30px !important;
      border-right: 3px solid #D44147 !important;
      box-sizing: border-box !important;
    }

    .property-row .model .renderedMarkdown:after{ position: absolute; top: -5px; left: 15px; content: '📎'; font-size: 25pt !important; }

    .property-row .model .renderedMarkdown p { line-height: 30px !important; color: mediumblue !important; padding: 0 !important; font-family: 'Handlee', cursive !important; }
    .property-row .model .renderedMarkdown ol, .property-row .model .renderedMarkdown ul { margin: -.5px; font-family: 'Handlee', cursive !important; line-height: 30px !important; }
    .property-row .model .renderedMarkdown ol li, .property-row .model .renderedMarkdown ul li { height: 30px !important; }
    .property-row .model .renderedMarkdown p b { color: red !important; }
    .swagger-ui textarea { border: solid 1px #ccc !important; }
    `,
    customSiteTitle: 'Telkomsel - SLRevamp Endpoint',
    customfavIcon: './icon.png',
    swaggerOptions: {
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      plugins: [CaseInsensitiveFilterPlugin],
      persistAuthorization: true,
      oauth2RedirectUrl: configService.get<string>(
        'core-backend.api.token-gateway',
      ),
      oauth: {
        clientId: configService.get<string>('core-backend.client.id'),
      },
    },
  });

  // app.useStaticAssets({
  //   root: path.join(__dirname, 'log_viewer/dist/'),
  //   prefix: `/static/`,
  // });

  // app.useStaticAssets(join(__dirname, '../img'), { prefix: '/BEPreprod/img' });
  // app.useGlobalInterceptors(new SentryInterceptor());

  app.useGlobalFilters(new RequestValidatorFilter());
  app.enableCors();
  // app.use('/admin/queues', serverAdapter.getRouter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      skipMissingProperties: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        let messages = [];
        validationErrors.map((e) => {
          // messages = messages.concat(Object.values(e.constraints));
          messages = messages.concat(e.constraints);
        });
        return new BadRequestException(messages);
      },
    }),
  );

  // app.setGlobalPrefix('hello');

  await app.listen(configService.get<string>('application.port'));
  console.log('SIGNAL_DONE');

  // const server = app.getHttpServer();
  // const router = server._events.request._router;
  //
  // const availableRoutes: [] = router.stack
  //   .map((layer) => {
  //     if (layer.route) {
  //       return {
  //         route: {
  //           path: layer.route?.path,
  //           method: layer.route?.stack[0].method,
  //         },
  //       };
  //     }
  //   })
  //   .filter((item) => item !== undefined);
  // console.log(availableRoutes);

  const modes = ['prod', 'preprod'];
  const modeCheck = process.env.NODE_ENV;
  if (modes.indexOf(modeCheck) < 0) {
    if (module.hot) {
      module.hot.accept();
      module.hot.dispose(() => app.close());
    }
  }
}

if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
