import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  const config = new DocumentBuilder()
    .setTitle('Assignment Listenery API')
    .setDescription('API for client registration, event ingestion, interview configurations, and dispatch rules')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'token',)
    .build();


  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalGuards(new JwtGuard(reflector));

  app.use((req, res, next) => {
    console.log(req.method, req.originalUrl);
    next();
  });

  await app.listen(process.env.PORT ?? 3000, () => {
    console.log('Server is running on port', process.env.PORT ?? 3000);
  });
}
bootstrap();
