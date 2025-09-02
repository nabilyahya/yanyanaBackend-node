import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '..', 'public', 'uploads')),
  );

  // إعداد معلومات Swagger
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API documentation with Swagger in NestJS')
    .setVersion('1.0')
    .addTag('Endpoints') // اختياري: لتصنيف الـ routes
    .build();

  // توليد الوثيقة بناءً على modules, controllers, decorators
  const document = SwaggerModule.createDocument(app, config);

  // تحديد مسار الواجهة: http://localhost:3000/api
  SwaggerModule.setup('api', app, document);

  // تشغيل التطبيق
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
