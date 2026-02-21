import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BunHttpAdapter, BunWsAdapter } from './platform';
import { WS_GATEWAY_CONFIG, API_PORT } from '@monokeros/constants';

async function bootstrap() {
  const httpAdapter = new BunHttpAdapter();
  const app = await NestFactory.create(AppModule, httpAdapter);

  app.useWebSocketAdapter(new BunWsAdapter(httpAdapter));
  app.enableCors({ origin: WS_GATEWAY_CONFIG.cors.origin, credentials: true });
  app.setGlobalPrefix('api');

  await app.listen(API_PORT);
  console.log(`API running on http://localhost:${API_PORT}`);
}
bootstrap();
