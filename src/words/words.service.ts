import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { definitions, frenchWords } from '../db/schema';

@Injectable()
export class WordsService {
  constructor(@Inject('DATABASE') private db: any) {}

  async getRandomWordsWithDefinitions(count: number = 5) {
    const randomWords = await this.db
      .select({
        id: frenchWords.id,
        word: frenchWords.word,
        definitions: sql<string[]>`array_agg(${definitions.definition})`,
      })
      .from(frenchWords)
      .leftJoin(definitions, eq(frenchWords.id, definitions.wordId))
      .groupBy(frenchWords.id, frenchWords.word)
      .orderBy(sql`RANDOM()`)
      .limit(count);

    return randomWords.map((word) => ({
      word: word.word,
      definitions: word.definitions || [],
    }));
  }
}