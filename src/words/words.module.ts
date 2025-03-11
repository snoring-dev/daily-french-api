import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { DeepseekService } from './deepseek.service';

@Module({
  imports: [],
  providers: [WordsService, DeepseekService],
  controllers: [WordsController],
})
export class WordsModule {}