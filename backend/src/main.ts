import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './module';
import { AdminMfaMiddleware } from './admin-security';
import { JwtService } from '@nestjs/jwt';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const mfa = new AdminMfaMiddleware(app.get(JwtService));
  app.use('/api/v1/admin', (req, res, next) => mfa.use(req, res, next));
  await app.listen(Number(process.env.PORT || 3001));
}
bootstrap();
