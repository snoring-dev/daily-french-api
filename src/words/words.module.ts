import { Module } from '@nestjs/common';
import { WordsService } from './words.service';
import { WordsController } from './words.controller';
import { DeepseekService } from './deepseek.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [WordsService, DeepseekService],
  controllers: [WordsController],
})
export class WordsModule {}
