import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';

@Module({
  imports: [],
  providers: [WordsService],
  controllers: [WordsController],
})
export class WordsModule {}