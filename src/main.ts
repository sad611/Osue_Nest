import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ForbiddenExceptionFilter } from './filters/forbidden-exception.filter';
import { EmbedService } from './services/discord/embed/embed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log'],
  });

  const originalConsoleLog = console.log;

  // app.useWebSocketAdapter(new WsAdapter())

  const embedService = app.get(EmbedService); 

  app.useGlobalFilters(new ForbiddenExceptionFilter(embedService));
  await app.listen(process.env.PORT || 3100);
}

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});

bootstrap();
