import {
  Controller,
  Get,
  UseGuards,
  Query,
  ParseIntPipe,
  Request,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WordsService } from './words.service';
import { Ranking } from 'src/utils/word_ranking';
import { UserService } from 'src/users/users.service';

@Controller('words')
@UseGuards(JwtAuthGuard)
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly userService: UserService,
  ) {}

  @Get('random')
  async getRandomWords(@Request() req) {
    const { userId } = req.user;
    const user = await this.userService.getUserById(userId);
    const frenchWords = await this.wordsService.getRandomWordsWithDefinitions(
      3,
      userId,
      user.languageLevel as Ranking,
    );
    await this.wordsService.addWordsToHistory(frenchWords);
    return frenchWords;
  }

  @Get('ranked')
  async getWordsWithRanking(
    @Query(
      'page',
      new DefaultValuePipe(1),
      new ParseIntPipe({ optional: true }),
    )
    page = 1,
  ) {
    return this.wordsService.getWordsWithRanking(page - 1);
  }

  @Get('unranked')
  async getWordsWithoutRanking(
    @Query(
      'page',
      new DefaultValuePipe(1),
      new ParseIntPipe({ optional: true }),
    )
    page = 1,
  ) {
    return this.wordsService.getWordsWithoutRanking(page - 1);
  }

  @Get('history')
  async getUserHistory(@Request() req) {
    const userId = req.user.userId;
    const history = await this.wordsService.getUserHistory(userId);
    return history;
  }
}
