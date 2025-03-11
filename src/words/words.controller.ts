import { Controller, Get, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WordsService } from './words.service';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('random')
  async getRandomWords() {
    return this.wordsService.getRandomWordsWithDefinitions(3);
  }

  @Get('ranked')
  async getWordsWithRanking() {
    return this.wordsService.getWordsWithRanking();
  }

  @Get('unranked')
  async getWordsWithoutRanking() {
    return this.wordsService.getWordsWithoutRanking();
  }
}