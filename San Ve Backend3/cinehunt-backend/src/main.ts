import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  // FIX: cần NestExpressApplication để dùng được app.useStaticAssets()
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // FIX: avatar được lưu vào uploads/avatars nhưng thư mục này chưa từng
  // được serve ra ngoài -> ảnh upload xong vẫn không hiển thị được (404).
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(join(uploadsDir, 'avatars'))) {
    mkdirSync(join(uploadsDir, 'avatars'), { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // FIX: CORS origin đọc từ biến môi trường thay vì hardcode
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:5173'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CineHunt API')
    .setDescription('Hệ thống đặt vé xem phim CineHunt')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`CineHunt backend đang chạy tại http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
