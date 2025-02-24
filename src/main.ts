import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log'],
  });

  const originalConsoleLog = console.log;

  // app.useWebSocketAdapter(new WsAdapter())
  await app.listen(process.env.PORT || 3100);
}

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});

bootstrap();
