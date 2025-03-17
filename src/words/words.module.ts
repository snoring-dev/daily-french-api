import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { DeepseekService } from './deepseek.service';
import { UsersModule } from 'src/users/users.module';
import { ImageGeneratorService } from './image-generator.service';

@Module({
  imports: [UsersModule],
  providers: [WordsService, DeepseekService, ImageGeneratorService],
  controllers: [WordsController],
})
export class WordsModule {}
