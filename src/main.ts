import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Clear public/videos directory
  const videosDir = path.join(process.cwd(), 'public', 'videos');

  // Ensure directory exists
  if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
    fs.mkdirSync(path.join(process.cwd(), 'public'));
  }

  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
  } else {
    // Delete all files in the videos directory
    const files = fs.readdirSync(videosDir);
    for (const file of files) {
      fs.unlinkSync(path.join(videosDir, file));
    }
    console.log(`Cleared ${files.length} files from public/videos directory`);
  }

  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}

bootstrap();
